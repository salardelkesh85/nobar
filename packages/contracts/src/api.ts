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
export const AddressCreateSchema = z.object({
  cityId: CityIdSchema,
  text: z.string().trim().min(5).max(300),
  label: z.string().trim().max(40).optional(),
});

const RialSchema = z.number().int().nonnegative().max(1_000_000_000_000);

export const SellerApplySchema = z.object({
  shopName: z.string().trim().min(2).max(60),
  cityId: CityIdSchema,
  description: z.string().trim().max(500).default(""),
  deliveryFeeRial: RialSchema.default(300_000),
});
export const SellerUpdateSchema = SellerApplySchema.partial().omit({ cityId: true });
export const SellerRejectSchema = z.object({ reason: z.string().trim().min(3).max(300) });

export const UnitSchema = z.enum(["KG", "PIECE", "BUNDLE", "BOX"]);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ باید YYYY-MM-DD باشد");

export const ProductCreateSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).default(""),
  unit: UnitSchema,
  priceRial: RialSchema.min(1),
  stock: z.number().int().nonnegative().max(100_000),
  minOrder: z.number().int().min(1).max(1000).default(1),
  harvestDate: IsoDate,
  isOrganic: z.boolean().default(false),
  seasonTags: z.array(z.string().trim().max(20)).max(8).default([]),
  emoji: z.string().max(8).optional(),
  publish: z.boolean().default(false),
});
export const ProductUpdateSchema = ProductCreateSchema.omit({ publish: true }).partial();
export const StockUpdateSchema = z.object({ stock: z.number().int().nonnegative().max(100_000) });

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

export const CheckoutSchema = z.object({
  address: z.object({ cityId: CityIdSchema, text: z.string().trim().min(5).max(300), label: z.string().trim().max(40).optional() }),
  paymentMethod: z.enum(["GATEWAY", "COD"]),
});

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
