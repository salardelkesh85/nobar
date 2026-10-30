// Demo orders, disputes, KYC, moderation, payouts and audit rows for the seller and admin panels.
import { daysAgo, hoursAgo, hoursFromNow } from "./clock";
import { listingById } from "./listings";

export type ShopOrderStatus =
  | "AWAITING_ACCEPTANCE"
  | "ACCEPTED"
  | "SHIPPED"
  | "DELIVERED"
  | "DISPUTED"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUNDED";

export const SHOP_ORDER_STATUS_FA: Record<ShopOrderStatus, string> = {
  AWAITING_ACCEPTANCE: "در انتظار تأیید غرفه",
  ACCEPTED: "تأیید شد، در حال آماده‌سازی",
  SHIPPED: "ارسال شد",
  DELIVERED: "تحویل شد",
  DISPUTED: "در حال بررسی شکایت",
  COMPLETED: "تکمیل شد",
  REJECTED: "رد شد",
  EXPIRED: "منقضی شد",
  CANCELLED: "لغو شد",
  REFUNDED: "بازپرداخت شد",
};

export const SHOP_ORDER_TONE: Record<ShopOrderStatus, "brand" | "nobar" | "saffron" | "neutral" | "danger" | "solid"> = {
  AWAITING_ACCEPTANCE: "saffron",
  ACCEPTED: "brand",
  SHIPPED: "brand",
  DELIVERED: "solid",
  DISPUTED: "nobar",
  COMPLETED: "neutral",
  REJECTED: "danger",
  EXPIRED: "danger",
  CANCELLED: "danger",
  REFUNDED: "danger",
};

export interface OrderLine {
  listingId: string;
  packageId: string;
  title: string;
  packageLabel: string;
  quantity: number;
  unitPriceRial: number;
}

export interface ShopOrder {
  code: string;
  shopId: string;
  buyerName: string;
  buyerPhoneMasked: string;
  destCityId: string;
  placedAt: string;
  status: ShopOrderStatus;
  lines: OrderLine[];
  shippingRial: number;
  method: "SELLER_LOCAL" | "POST" | "TIPAX" | "FREIGHT";
  commissionBps: number;
  acceptDeadline?: string;
  trackingCode?: string;
  shippedAt?: string;
  deliveredAt?: string;
  complaintEndsAt?: string;
  payoutId?: string;
}

function line(listingId: string, pkgIndex: number, quantity: number): OrderLine {
  const l = listingById(listingId);
  const p = l?.packages[pkgIndex];
  if (!l || !p) throw new Error(`Bad demo line ${listingId}`);
  return { listingId, packageId: p.id, title: l.title, packageLabel: p.label, quantity, unitPriceRial: p.priceRial };
}

export const itemsTotal = (o: Pick<ShopOrder, "lines">): number => o.lines.reduce((s, l) => s + l.unitPriceRial * l.quantity, 0);
export const commissionOf = (o: ShopOrder): number => Math.floor((itemsTotal(o) * o.commissionBps + 5_000) / 10_000);
export const sellerNet = (o: ShopOrder): number => itemsTotal(o) + o.shippingRial - commissionOf(o);

const T = (t: number) => t * 10;

export const SHOP_ORDERS: ShopOrder[] = [
  { code: "NB-4K7Q-92XD", shopId: "s1", buyerName: "مریم ر.", buyerPhoneMasked: "0912***4567", destCityId: "tehran", placedAt: hoursAgo(2), status: "AWAITING_ACCEPTANCE", lines: [line("l101", 0, 2)], shippingRial: T(184_000), method: "TIPAX", commissionBps: 1000, acceptDeadline: hoursFromNow(4) },
  { code: "NB-7H2M-31KA", shopId: "s1", buyerName: "علی م.", buyerPhoneMasked: "0935***1290", destCityId: "karaj", placedAt: hoursAgo(5), status: "AWAITING_ACCEPTANCE", lines: [line("l103", 0, 1), line("l101", 2, 3)], shippingRial: T(157_000), method: "TIPAX", commissionBps: 1000, acceptDeadline: hoursFromNow(1) },
  { code: "NB-2PZ8-77QE", shopId: "s1", buyerName: "زهرا ک.", buyerPhoneMasked: "0914***8802", destCityId: "miandoab", placedAt: hoursAgo(20), status: "ACCEPTED", lines: [line("l102", 0, 2)], shippingRial: 0, method: "SELLER_LOCAL", commissionBps: 1000 },
  { code: "NB-9W3C-05RT", shopId: "s1", buyerName: "نرگس ت.", buyerPhoneMasked: "0914***3321", destCityId: "tabriz", placedAt: daysAgo(2, 18), status: "SHIPPED", lines: [line("l101", 1, 1)], shippingRial: T(175_000), method: "TIPAX", commissionBps: 1000, trackingCode: "TPX-55102938", shippedAt: daysAgo(1, 10) },
  { code: "NB-5D1L-48UY", shopId: "s1", buyerName: "حسین س.", buyerPhoneMasked: "0919***6610", destCityId: "tehran", placedAt: daysAgo(4, 21), status: "DELIVERED", lines: [line("l103", 0, 2)], shippingRial: T(175_000), method: "TIPAX", commissionBps: 1000, trackingCode: "TPX-55100417", shippedAt: daysAgo(3, 10), deliveredAt: hoursAgo(10), complaintEndsAt: hoursFromNow(14) },
  { code: "NB-3B6N-12FG", shopId: "s1", buyerName: "سارا ا.", buyerPhoneMasked: "0912***0098", destCityId: "isfahan", placedAt: daysAgo(6, 9), status: "DISPUTED", lines: [line("l101", 0, 1)], shippingRial: T(130_000), method: "TIPAX", commissionBps: 1000, trackingCode: "TPX-55099120", shippedAt: daysAgo(5, 10), deliveredAt: daysAgo(3, 15) },
  { code: "NB-8E4V-66JH", shopId: "s1", buyerName: "محمد ن.", buyerPhoneMasked: "0937***4512", destCityId: "tehran", placedAt: daysAgo(9, 12), status: "COMPLETED", lines: [line("l101", 1, 2)], shippingRial: 0, method: "TIPAX", commissionBps: 1000, trackingCode: "TPX-55091010", deliveredAt: daysAgo(6, 12) },
  { code: "NB-6T9P-20LM", shopId: "s1", buyerName: "فاطمه ح.", buyerPhoneMasked: "0913***7781", destCityId: "isfahan", placedAt: daysAgo(12, 12), status: "COMPLETED", lines: [line("l101", 0, 3)], shippingRial: T(175_000), method: "POST", commissionBps: 1000, deliveredAt: daysAgo(8, 12), payoutId: "PO-1405-0812" },
  { code: "NB-1R5S-83WZ", shopId: "s1", buyerName: "کاوه ب.", buyerPhoneMasked: "0915***2209", destCityId: "mashhad", placedAt: daysAgo(14, 12), status: "COMPLETED", lines: [line("l103", 0, 2), line("l102", 0, 1)], shippingRial: T(230_000), method: "FREIGHT", commissionBps: 1000, deliveredAt: daysAgo(10, 12), payoutId: "PO-1405-0812" },
  { code: "NB-0Y7U-54NB", shopId: "s1", buyerName: "لیلا ش.", buyerPhoneMasked: "0917***3390", destCityId: "shiraz", placedAt: daysAgo(15, 12), status: "REJECTED", lines: [line("l101", 2, 2)], shippingRial: T(112_000), method: "POST", commissionBps: 1000 },
  // other shops — admin views
  { code: "NB-4A2C-19PO", shopId: "s5", buyerName: "مینا ق.", buyerPhoneMasked: "0912***5521", destCityId: "tehran", placedAt: hoursAgo(3), status: "AWAITING_ACCEPTANCE", lines: [line("l501", 0, 2)], shippingRial: 0, method: "TIPAX", commissionBps: 1000, acceptDeadline: hoursFromNow(3) },
  { code: "NB-2C8F-60TT", shopId: "s7", buyerName: "آرش د.", buyerPhoneMasked: "0921***8840", destCityId: "tehran", placedAt: daysAgo(3, 12), status: "DISPUTED", lines: [line("l701", 0, 1)], shippingRial: T(130_000), method: "TIPAX", commissionBps: 900, deliveredAt: daysAgo(1, 12) },
  { code: "NB-7K0D-27GH", shopId: "s9", buyerName: "سمیرا ز.", buyerPhoneMasked: "0912***1107", destCityId: "tehran", placedAt: daysAgo(4, 12), status: "DISPUTED", lines: [line("l901", 1, 1)], shippingRial: T(180_000), method: "FREIGHT", commissionBps: 1000, deliveredAt: daysAgo(2, 12) },
  { code: "NB-9M6Q-31XC", shopId: "s8", buyerName: "مهسا پ.", buyerPhoneMasked: "0939***6602", destCityId: "tehran", placedAt: daysAgo(8, 12), status: "COMPLETED", lines: [line("l801", 1, 2)], shippingRial: T(220_000), method: "POST", commissionBps: 1000, deliveredAt: daysAgo(5, 12) },
  { code: "NB-5S3E-88AA", shopId: "s3", buyerName: "محمد ن.", buyerPhoneMasked: "0937***4512", destCityId: "tehran", placedAt: daysAgo(6, 12), status: "COMPLETED", lines: [line("l301", 1, 2)], shippingRial: T(210_000), method: "FREIGHT", commissionBps: 1000, deliveredAt: daysAgo(3, 12) },
];

export type DisputeReason = "SPOILED" | "DAMAGED" | "UNDERWEIGHT" | "WRONG_ITEM" | "NOT_DELIVERED" | "OTHER";
export const DISPUTE_REASON_FA: Record<DisputeReason, string> = {
  SPOILED: "خراب یا گندیده",
  DAMAGED: "آسیب‌دیده در ارسال",
  UNDERWEIGHT: "کم‌وزن",
  WRONG_ITEM: "اشتباه ارسال شده",
  NOT_DELIVERED: "نرسیده",
  OTHER: "سایر",
};

export interface Dispute {
  id: string;
  orderCode: string;
  shopId: string;
  reason: DisputeReason;
  description: string;
  requested: "FULL_REFUND" | "PARTIAL_REFUND";
  requestedRial: number;
  status: "AWAITING_SELLER" | "AWAITING_STAFF" | "RESOLVED" | "REJECTED";
  sellerResponse?: string;
  sellerOfferRial?: number;
  photos: number;
  openedAt: string;
}

export const DISPUTE_STATUS_FA: Record<Dispute["status"], string> = {
  AWAITING_SELLER: "منتظر پاسخ غرفه",
  AWAITING_STAFF: "منتظر داوری نوبر",
  RESOLVED: "حل شد",
  REJECTED: "رد شد",
};

export const DISPUTES: Dispute[] = [
  { id: "D-1042", orderCode: "NB-3B6N-12FG", shopId: "s1", reason: "DAMAGED", description: "حدود یک کیلو از سیب‌ها در راه ضرب دیده و کبود شده بود. عکس فرستادم.", requested: "PARTIAL_REFUND", requestedRial: T(90_000), status: "AWAITING_SELLER", photos: 3, openedAt: hoursAgo(5) },
  { id: "D-1039", orderCode: "NB-2C8F-60TT", shopId: "s7", reason: "UNDERWEIGHT", description: "جعبه را وزن کردم، ۴ کیلو و ۳۰۰ گرم بود نه ۵ کیلو.", requested: "PARTIAL_REFUND", requestedRial: T(78_000), status: "AWAITING_STAFF", sellerResponse: "جعبه موقع ارسال ۵ کیلو و ۱۰۰ گرم بود؛ عکس ترازو را می‌فرستم.", sellerOfferRial: T(40_000), photos: 2, openedAt: daysAgo(1, 14) },
  { id: "D-1035", orderCode: "NB-7K0D-27GH", shopId: "s9", reason: "SPOILED", description: "یک‌سوم گوجه‌ها له و آب‌افتاده رسید.", requested: "PARTIAL_REFUND", requestedRial: T(200_000), status: "AWAITING_STAFF", sellerResponse: "باربری دیر تحویل داده؛ حاضریم نصف مبلغ را برگردانیم.", sellerOfferRial: T(100_000), photos: 4, openedAt: daysAgo(2, 9) },
];

export interface KycCase {
  id: string;
  shopName: string;
  ownerName: string;
  type: "GROWER" | "SHOP" | "COOPERATIVE";
  cityId: string;
  nationalIdLast4: string;
  shebaLast4: string;
  documents: number;
  farmPhotos: number;
  submittedAt: string;
  note?: string;
}

export const KYC_QUEUE: KycCase[] = [
  { id: "K-311", shopName: "باغ آلبالو و سیب سلماس", ownerName: "یوسف ا.", type: "GROWER", cityId: "urmia", nationalIdLast4: "4471", shebaLast4: "0193", documents: 3, farmPhotos: 6, submittedAt: hoursAgo(6) },
  { id: "K-309", shopName: "تعاونی پسته‌کاران", ownerName: "هیئت‌مدیره", type: "COOPERATIVE", cityId: "kerman", nationalIdLast4: "9902", shebaLast4: "7781", documents: 4, farmPhotos: 3, submittedAt: daysAgo(1, 11), note: "کارت ملی پشت‌ورو نیست" },
  { id: "K-305", shopName: "سبزی‌فروشی گل‌محمدی", ownerName: "مرضیه گ.", type: "SHOP", cityId: "miandoab", nationalIdLast4: "1208", shebaLast4: "5524", documents: 2, farmPhotos: 2, submittedAt: daysAgo(2, 16) },
];

export interface ModerationCase {
  id: string;
  subject: "LISTING" | "REVIEW" | "SHOP";
  title: string;
  shopName: string;
  ruleHits: string[];
  excerpt: string;
  openedAt: string;
}

export const MODERATION_QUEUE: ModerationCase[] = [
  { id: "M-882", subject: "LISTING", title: "انگور یاقوتی ارگانیک", shopName: "تاکستان نوری", ruleHits: ["ادعای ارگانیک بدون گواهی"], excerpt: "انگور کاملاً ارگانیک و بدون سم…", openedAt: hoursAgo(3) },
  { id: "M-879", subject: "LISTING", title: "سیب قرمز ارومیه درجه‌یک", shopName: "تعاونی باغداران ارومیه", ruleHits: ["تغییر قیمت بیش از ۳۰٪ در یک روز"], excerpt: "قیمت از ۵۶۰ هزار به ۸۲۰ هزار تومان", openedAt: hoursAgo(9) },
  { id: "M-874", subject: "REVIEW", title: "نظر روی انار ملس ساوه", shopName: "انارستان ملکی", ruleHits: ["شماره‌ی تلفن در متن"], excerpt: "برای خرید عمده به این شماره زنگ بزنید ۰۹۱۲…", openedAt: daysAgo(1, 10) },
  { id: "M-870", subject: "LISTING", title: "خرمای مضافتی", shopName: "نخلستان ارگ", ruleHits: ["عکس تکراری با غرفه‌ی دیگر"], excerpt: "شباهت تصویر ۹۴٪ با آگهی دیگری", openedAt: daysAgo(1, 18) },
];

export interface Payout {
  id: string;
  shopId: string;
  amountRial: number;
  orders: number;
  status: "SCHEDULED" | "PAID" | "FAILED";
  date: string;
  shebaLast4: string;
}

export const PAYOUTS: Payout[] = [
  { id: "PO-1405-0815", shopId: "s1", amountRial: 0, orders: 0, status: "SCHEDULED", date: daysAgo(-2, 10), shebaLast4: "3381" },
  { id: "PO-1405-0812", shopId: "s1", amountRial: 0, orders: 2, status: "PAID", date: daysAgo(5, 10), shebaLast4: "3381" },
  { id: "PO-1405-0806", shopId: "s1", amountRial: T(2_180_000), orders: 4, status: "PAID", date: daysAgo(12, 10), shebaLast4: "3381" },
  { id: "PO-1405-0812-b", shopId: "s5", amountRial: T(4_920_000), orders: 7, status: "PAID", date: daysAgo(5, 10), shebaLast4: "0042" },
  { id: "PO-1405-0812-c", shopId: "s8", amountRial: T(3_350_000), orders: 5, status: "FAILED", date: daysAgo(5, 10), shebaLast4: "7710" },
];

// Fill the payout amounts that come from completed orders.
for (const p of PAYOUTS) {
  const orders = SHOP_ORDERS.filter((o) => o.payoutId === p.id);
  if (orders.length) {
    p.amountRial = orders.reduce((s, o) => s + sellerNet(o), 0);
    p.orders = orders.length;
  }
}

export interface AuditRow {
  id: string;
  actor: string;
  action: string;
  subject: string;
  at: string;
}

export const AUDIT_LOG: AuditRow[] = [
  { id: "A-9001", actor: "نگار (پشتیبانی)", action: "تأیید هویت غرفه", subject: "کیوی‌باغ آستارا", at: hoursAgo(1) },
  { id: "A-9000", actor: "بهزاد (مالی)", action: "اجرای دسته‌ی تسویه", subject: "PO-1405-0812", at: daysAgo(5, 10) },
  { id: "A-8998", actor: "نگار (پشتیبانی)", action: "رد آگهی", subject: "سیب «ارگانیک» بدون گواهی", at: daysAgo(1, 12) },
  { id: "A-8996", actor: "سیستم", action: "توقف خودکار آگهی (خارج از تازگی)", subject: "سبزی خوردن دیروز", at: daysAgo(1, 7) },
  { id: "A-8991", actor: "امید (داوری)", action: "حل شکایت با بازپرداخت جزئی", subject: "D-1031", at: daysAgo(2, 15) },
  { id: "A-8987", actor: "بهزاد (مالی)", action: "تغییر کمیسیون دسته‌ی مرکبات به ۹٪", subject: "مرکبات", at: daysAgo(4, 9) },
  { id: "A-8980", actor: "نگار (پشتیبانی)", action: "تأیید نوع محصول", subject: "نارنگی", at: daysAgo(6, 11) },
];

export const COMMISSION_RULES = [
  { scope: "سراسری", rateBps: 1000 },
  { scope: "دسته: مرکبات", rateBps: 900 },
  { scope: "دسته: خشکبار و خرما", rateBps: 1200 },
  { scope: "غرفه: کیوی‌باغ آستارا (شش ماه اول)", rateBps: 800 },
];
