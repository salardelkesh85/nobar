import { Inject, Injectable } from "@nestjs/common";
import { conflict, type Database, iso, isoOrNull, notFound, type Sql, TOKENS } from "@nobar/common";
import { isUuid, uuidv7 } from "@nobar/contracts";
import { cityName } from "@nobar/contracts/cities";
import { cleanFaText, toEnDigits } from "@nobar/fa";
import type { Review } from "@nobar/domain";
import { type Actor, AuditService } from "../audit/audit.service";
import { CatalogService } from "../catalog/catalog.service";
import { UsersService } from "../identity/users.service";
import { FulfilmentService } from "../order/fulfilment.service";

/** Contact details in public text are a kit moderation rule («شماره‌ی تلفن در متن»). */
export function contactFlags(text: string): string[] {
  const t = toEnDigits(text);
  const flags: string[] = [];
  if (/(?:\+?98|0)?9\d{9}|\d{8,}/.test(t.replace(/[\s-]/g, ""))) flags.push("شماره‌ی تلفن در متن");
  if (/https?:\/\/|www\.|t\.me\/|@[a-z0-9_]{4,}/i.test(t)) flags.push("نشانی یا آیدی در متن");
  return flags;
}

/** "مریم کریمی" → "مریم ک." — the public name on a review. */
const publicName = (name: string | null) => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "خریدار نوبر";
  return parts.length > 1 ? `${parts[0]} ${parts[1]![0]}.` : parts[0]!;
};

interface ReviewRow {
  id: string;
  listing_id: string;
  shop_id: string;
  buyer_name: string;
  buyer_city: string;
  rating: number;
  freshness_rating: number;
  text: string;
  status: string;
  flags: string[];
  seller_reply: string | null;
  created_at: Date;
}
const toReview = (r: ReviewRow): Review & { status: string; flags: string[] } => ({
  id: r.id,
  listingId: r.listing_id,
  shopId: r.shop_id,
  buyerName: r.buyer_name,
  buyerCity: r.buyer_city,
  rating: r.rating,
  freshnessRating: r.freshness_rating,
  text: r.text,
  createdAt: iso(r.created_at),
  ...(r.seller_reply ? { sellerReply: r.seller_reply } : {}),
  status: r.status,
  flags: r.flags,
});

interface QuestionRow {
  id: string;
  listing_id: string;
  question: string;
  answer: string | null;
  status: string;
  flags: string[];
  created_at: Date;
  answered_at: Date | null;
}
const toQuestion = (q: QuestionRow) => ({
  id: q.id,
  listingId: q.listing_id,
  question: q.question,
  answer: q.answer,
  status: q.status,
  flags: q.flags,
  createdAt: iso(q.created_at),
  answeredAt: isoOrNull(q.answered_at),
});

/** Reviews (after delivery, shown once staff approve) and product questions (answered by the shop). Owns `review`. */
@Injectable()
export class ReviewService {
  constructor(
    @Inject(TOKENS.DB) private readonly db: Database,
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(FulfilmentService) private readonly orders: FulfilmentService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Demo reviews from packages/demo, already counted in the demo shops' ratings. */
  async seed(reviews: readonly Review[]): Promise<void> {
    const [row] = await this.db.query<{ n: number }>("select count(*)::int as n from review.reviews");
    if ((row?.n ?? 0) > 0) return;
    await this.db.tx(async (sql) => {
      for (const r of reviews) {
        await sql.query(
          `insert into review.reviews (id, listing_id, shop_id, buyer_name, buyer_city, rating, freshness_rating, text, status, seller_reply, created_at, published_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, 'PUBLISHED', $9, $10, $10)`,
          [r.id, r.listingId, r.shopId, r.buyerName, r.buyerCity, r.rating, r.freshnessRating, r.text, r.sellerReply ?? null, r.createdAt],
        );
      }
    });
  }

  private async listing(listingId: string) {
    const l = (await this.catalog.market()).listingById(listingId);
    if (!l || l.status !== "PUBLISHED") throw notFound("محصول");
    return l;
  }

  // ---------- public

  async forListing(listingId: string) {
    const rows = await this.db.query<ReviewRow>("select * from review.reviews where listing_id = $1 and status = 'PUBLISHED' order by created_at desc limit 100", [listingId]);
    return rows.map((r) => {
      const { status: _s, flags: _f, ...rest } = toReview(r);
      return rest;
    });
  }

  async questionsFor(listingId: string) {
    const rows = await this.db.query<QuestionRow>("select * from review.questions where listing_id = $1 and status = 'ANSWERED' order by answered_at desc limit 100", [listingId]);
    return rows.map(({ id, question, answer, answered_at }) => ({ id, question, answer, answeredAt: isoOrNull(answered_at) }));
  }

  // ---------- buyer

  /** One review per delivered order line; it waits for staff before it is shown. */
  async write(userId: string, listingId: string, input: { orderId: string; rating: number; freshnessRating: number; text: string }) {
    const order = await this.orders.buyerOrder(userId, input.orderId);
    if (!order.items.some((i) => i.listingId === listingId)) throw notFound("این محصول در سفارش");
    if (!["DELIVERED", "COMPLETED", "DISPUTED"].includes(order.status)) throw conflict("NOT_DELIVERED_YET", "بعد از تحویل سفارش می‌توانید دیدگاه بنویسید");
    const user = await this.users.get(userId);
    const text = cleanFaText(input.text);
    const id = uuidv7();
    const rows = await this.db.query<ReviewRow>(
      `insert into review.reviews (id, listing_id, shop_id, order_id, user_id, buyer_name, buyer_city, rating, freshness_rating, text, status, flags)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11) on conflict do nothing returning *`,
      [id, listingId, order.shopId, order.id, userId, publicName(user.name), cityName(order.address.cityId), input.rating, input.freshnessRating, text, contactFlags(text)],
    );
    if (!rows[0]) throw conflict("ALREADY_REVIEWED", "برای این خرید قبلاً دیدگاه نوشته‌اید");
    return toReview(rows[0]);
  }

  async ask(userId: string, listingId: string, question: string) {
    const l = await this.listing(listingId);
    const text = cleanFaText(question);
    const [row] = await this.db.query<QuestionRow>(
      "insert into review.questions (id, listing_id, shop_id, user_id, question, status, flags) values ($1, $2, $3, $4, $5, 'OPEN', $6) returning *",
      [uuidv7(), l.id, l.shopId, userId, text, contactFlags(text)],
    );
    return toQuestion(row!);
  }

  async myQuestions(userId: string) {
    return (await this.db.query<QuestionRow>("select * from review.questions where user_id = $1 order by created_at desc limit 100", [userId])).map(toQuestion);
  }

  // ---------- seller

  private async shops(userId: string) {
    const shops = await this.catalog.shopIdsOwnedBy(userId);
    if (!shops.length) throw notFound("غرفه");
    return shops;
  }

  async sellerReviews(userId: string) {
    const rows = await this.db.query<ReviewRow>("select * from review.reviews where shop_id = any($1::text[]) and status <> 'REJECTED' order by created_at desc limit 200", [await this.shops(userId)]);
    return rows.map(toReview);
  }

  async reply(userId: string, id: string, reply: string) {
    const [row] = await this.db.query<ReviewRow>("update review.reviews set seller_reply = $3 where id = $1 and shop_id = any($2::text[]) and status = 'PUBLISHED' returning *", [
      id,
      await this.shops(userId),
      cleanFaText(reply),
    ]);
    if (!row) throw notFound("دیدگاه");
    return toReview(row);
  }

  async sellerQuestions(userId: string) {
    return (await this.db.query<QuestionRow>("select * from review.questions where shop_id = any($1::text[]) and status <> 'HIDDEN' order by status, created_at desc limit 200", [await this.shops(userId)])).map(toQuestion);
  }

  async answer(userId: string, id: string, answer: string) {
    if (!isUuid(id)) throw notFound("پرسش");
    const [row] = await this.db.query<QuestionRow>(
      "update review.questions set answer = $3, status = 'ANSWERED', answered_at = now() where id = $1 and shop_id = any($2::text[]) and status <> 'HIDDEN' returning *",
      [id, await this.shops(userId), cleanFaText(answer)],
    );
    if (!row) throw notFound("پرسش");
    return toQuestion(row);
  }

  // ---------- staff

  async pending() {
    const reviews = await this.db.query<ReviewRow>("select * from review.reviews where status = 'PENDING' order by created_at");
    const questions = await this.db.query<QuestionRow>("select * from review.questions where status = 'OPEN' and array_length(flags, 1) > 0 order by created_at");
    return { reviews: reviews.map(toReview), flaggedQuestions: questions.map(toQuestion) };
  }

  private async decide(sql: Sql, id: string): Promise<ReviewRow> {
    const [r] = await sql.query<ReviewRow>("select * from review.reviews where id = $1 for update", [id]);
    if (!r) throw notFound("دیدگاه");
    if (r.status !== "PENDING") throw conflict("REVIEW_STATE", "این دیدگاه قبلاً بررسی شده است");
    return r;
  }

  async approve(actor: Actor, id: string) {
    await this.catalog.market();
    await this.db.tx(async (sql) => {
      const r = await this.decide(sql, id);
      await sql.query("update review.reviews set status = 'PUBLISHED', published_at = now() where id = $1", [r.id]);
      await this.catalog.addShopRating(sql, r.shop_id, r.rating, r.freshness_rating);
      await this.audit.record(sql, actor, "تأیید دیدگاه", r.text.slice(0, 60));
    });
    this.catalog.invalidate();
  }

  async reject(actor: Actor, id: string, reason: string) {
    await this.db.tx(async (sql) => {
      const r = await this.decide(sql, id);
      await sql.query("update review.reviews set status = 'REJECTED' where id = $1", [r.id]);
      await this.audit.record(sql, actor, "رد دیدگاه", `${r.text.slice(0, 40)}: ${reason}`);
    });
  }

  async hideQuestion(actor: Actor, id: string) {
    if (!isUuid(id)) throw notFound("پرسش");
    await this.db.tx(async (sql) => {
      const [q] = await sql.query<{ question: string }>("update review.questions set status = 'HIDDEN' where id = $1 and status <> 'HIDDEN' returning question", [id]);
      if (!q) throw notFound("پرسش");
      await this.audit.record(sql, actor, "پنهان کردن پرسش", q.question.slice(0, 60));
    });
  }
}
