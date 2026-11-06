import { z } from "zod";
import { CITY_IDS } from "./cities";

// Request schemas shared by the services (validation) and the web app (forms).

const faDigitsToEn = (v: string) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** Iranian mobile numbers in any common form → E.164 (`+989121234567`). */
export function normalizeIranPhone(input: string): string | null {
  const digits = faDigitsToEn(input).replace(/[\s\-()]/g, "");
  const m = digits.match(/^(?:\+98|0098|98|0)?(9\d{9})$/);
  return m ? `+98${m[1]}` : null;
}

export const PhoneSchema = z
  .string()
  .transform((v, ctx) => {
    const p = normalizeIranPhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "شماره‌ی موبایل معتبر نیست" });
      return z.NEVER;
    }
    return p;
  });

export const CityIdSchema = z.enum(CITY_IDS);

/** Query-string boolean: "true"/"1" → true, "false"/"0" → false (z.coerce.boolean would turn "false" into true). */
export const BoolQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
  .transform((v) => v === true || v === "true" || v === "1");

export const OtpRequestSchema = z.object({ phone: PhoneSchema });
export const OtpVerifySchema = z.object({
  phone: PhoneSchema,
  code: z.string().transform(faDigitsToEn).pipe(z.string().regex(/^\d{6}$/, "کد باید ۶ رقم باشد")),
});
export const RefreshSchema = z.object({ refreshToken: z.string().min(10) });
export const UpdateMeSchema = z.object({ name: z.string().trim().min(2).max(60).optional(), cityId: CityIdSchema.optional() });
/** Same rules as the store's address form (apps/web/components/address-form.tsx). */
export const AddressCreateSchema = z.object({
  title: z.string().trim().min(1).max(40),
  cityId: CityIdSchema,
  name: z.string().trim().min(3, "نام و نام خانوادگی تحویل‌گیرنده را بنویسید").max(80),
  phone: PhoneSchema,
  line: z.string().trim().min(10, "آدرس را کامل‌تر بنویسید").max(300),
  postalCode: z
    .string()
    .transform((v) => faDigitsToEn(v).replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10}$/, "کد پستی ۱۰ رقم است")),
});
export const AddressUpdateSchema = AddressCreateSchema.partial();

const RialSchema = z.number().int().nonnegative().max(1_000_000_000_000);

const Text = (min: number, max: number, message?: string) => z.string().trim().min(min, message).max(max);
const ShippingRateSchema = z.object({
  method: z.enum(["SELLER_LOCAL", "POST", "TIPAX", "FREIGHT"]),
  baseRial: RialSchema,
  perKgRial: RialSchema,
  freeOverRial: RialSchema.optional(),
  maxWeightGrams: z.number().int().min(1_000).max(1_000_000),
});

/** Seller onboarding (kit: shop details and KYC → staff approval). */
export const ShopApplySchema = z.object({
  name: Text(2, 60, "نام غرفه را بنویسید"),
  type: z.enum(["GROWER", "SHOP", "COOPERATIVE"]),
  cityId: CityIdSchema,
  ownerName: Text(2, 60),
  handlingDays: z.number().int().min(0).max(7),
  acceptanceSlaHours: z.number().int().min(1).max(48),
  story: z.object({
    title: Text(3, 80),
    body: z.array(Text(10, 1500)).min(1).max(6),
    practices: z.array(Text(2, 60)).max(8).default([]),
    sinceYear: z.number().int().min(1300).max(1500),
  }),
  shipping: z
    .array(ShippingRateSchema)
    .min(1, "دست‌کم یک روش ارسال لازم است")
    .max(4)
    .refine((rates) => new Set(rates.map((r) => r.method)).size === rates.length, "هر روش ارسال یک بار"),
  kyc: z.object({ nationalId: z.string().max(20), sheba: z.string().max(40) }),
});
export const ShopUpdateSchema = ShopApplySchema.omit({ cityId: true, kyc: true, type: true }).partial();

const PackageSchema = z
  .object({
    label: Text(1, 40),
    netGrams: z.number().int().min(100).max(100_000).optional(),
    units: z.number().int().min(1).max(500).optional(),
    priceRial: RialSchema.min(1_000),
  })
  .refine((p) => (p.netGrams === undefined) !== (p.units === undefined), "هر بسته یا وزن دارد یا تعداد");

export const ListingCreateSchema = z.object({
  produceTypeId: Text(1, 80),
  title: Text(3, 80, "عنوان را بنویسید"),
  variety: Text(1, 60).optional(),
  description: Text(20, 2000, "توضیح محصول را کامل‌تر بنویسید"),
  grade: z.enum(["PREMIUM", "GRADE_1", "GRADE_2", "PROCESSING"]),
  originCityId: CityIdSchema.optional(),
  isOrganic: z.boolean().default(false),
  harvestedAt: z.string().datetime({ offset: true, message: "تاریخ برداشت معتبر نیست" }),
  stockBase: z.number().int().min(0).max(100_000_000),
  packages: z.array(PackageSchema).min(1).max(5),
  tags: z.array(Text(1, 30)).max(8).default([]),
  isPreorder: z.boolean().default(false),
  preorderDispatchFrom: z.string().datetime({ offset: true }).optional(),
});
export const ListingUpdateSchema = ListingCreateSchema.omit({ produceTypeId: true }).partial();
export const StockUpdateSchema = z.object({ stockBase: z.number().int().min(0).max(100_000_000) });
export const PriceUpdateSchema = z.object({ prices: z.array(z.object({ packageId: Text(1, 100), priceRial: RialSchema.min(1_000) })).min(1).max(5) });

export const ProductListQuerySchema = z.object({
  cityId: CityIdSchema.optional(),
  categoryId: z.string().optional(),
  sellerId: z.string().optional(),
  organic: BoolQuerySchema.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "freshness"]).default("newest"),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export const SearchQuerySchema = z.object({
  q: z.string().max(200).default(""),
  cityId: CityIdSchema,
  categoryId: z.string().optional(),
  organic: BoolQuerySchema.optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  maxFreshnessHours: z.coerce.number().int().positive().optional(),
  sellerId: z.string().optional(),
  inStock: BoolQuerySchema.optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "freshness"]).default("relevance"),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const CartAddSchema = z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(100) });
export const CartUpdateSchema = z.object({ qty: z.number().int().min(0).max(100) });
export const CartMergeSchema = z.object({ guestId: z.string().min(8).max(64) });
export const CartAddListingSchema = z.object({ listingId: z.string().trim().min(1).max(100), packageId: z.string().trim().min(1).max(100), qty: z.number().int().min(1).max(100) });
export const CartSetSchema = z.object({ listingId: z.string().trim().min(1).max(100), packageId: z.string().trim().min(1).max(100), qty: z.number().int().min(0).max(100) });

export const CheckoutSchema = z.object({
  address: z.object({ cityId: CityIdSchema, text: z.string().trim().min(5).max(300), label: z.string().trim().max(40).optional() }),
  paymentMethod: z.enum(["GATEWAY", "COD"]),
});
export const ShippingMethodSchema = z.enum(["SELLER_LOCAL", "POST", "TIPAX", "FREIGHT"]);
export const CheckoutCreateSchema = z.object({
  addressId: z.string().uuid("شناسهٔ آدرس معتبر نیست"),
  paymentMethod: z.enum(["GATEWAY", "COD"]),
  /** shipping method chosen per shop id; shops left out get their cheapest method */
  shipping: z.record(z.string().min(1).max(100), ShippingMethodSchema).default({}),
});

const RialAmount = z.number().int().positive().max(1_000_000_000_000);
export const ShipSchema = z.object({ trackingCode: z.string().trim().min(3).max(60).optional() });
export const DisputeOpenSchema = z.object({
  reason: z.enum(["SPOILED", "DAMAGED", "UNDERWEIGHT", "WRONG_ITEM", "NOT_DELIVERED", "OTHER"]),
  description: z.string().trim().min(10, "مشکل را کمی کامل‌تر بنویسید").max(1000),
  requested: z.enum(["FULL_REFUND", "PARTIAL_REFUND"]),
  requestedRial: RialAmount.optional(),
});
export const DisputeAnswerSchema = z.object({ response: z.string().trim().min(5).max(1000), offerRial: RialAmount.optional() });
export const DisputeResolveSchema = z.object({ refundRial: z.number().int().nonnegative().max(1_000_000_000_000), note: z.string().trim().min(3).max(500) });

export const ReasonSchema = z.object({ reason: z.string().trim().min(2).max(300) });
export const OptionalReasonSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const AssistantChatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().max(64).optional(),
  cityId: CityIdSchema,
});
export const AssistantFeedbackSchema = z.object({
  conversationId: z.string().max(64),
  messageId: z.string().max(64),
  rating: z.enum(["up", "down"]),
  comment: z.string().max(500).optional(),
});
export const CompareSchema = z.object({
  productIds: z.array(z.string().min(1)).min(2).max(4),
  cityId: CityIdSchema.optional(),
});
