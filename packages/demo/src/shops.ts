import type { ShippingRate, Shop } from "./types";

// Demo shops (docs/02 §17). Names and people are fictional.

const T = (toman: number): number => toman * 10;

const intercity = (extra: Partial<Record<"post" | "tipax" | "freight", false>> = {}): ShippingRate[] => {
  const rates: ShippingRate[] = [];
  if (extra.post !== false) rates.push({ method: "POST", baseRial: T(55_000), perKgRial: T(6_000), maxWeightGrams: 20_000 });
  if (extra.tipax !== false) rates.push({ method: "TIPAX", baseRial: T(85_000), perKgRial: T(9_000), freeOverRial: T(3_000_000), maxWeightGrams: 30_000 });
  if (extra.freight !== false) rates.push({ method: "FREIGHT", baseRial: T(140_000), perKgRial: T(2_500), maxWeightGrams: 200_000 });
  return rates;
};
const local = (baseToman = 30_000): ShippingRate => ({ method: "SELLER_LOCAL", baseRial: T(baseToman), perKgRial: 0, freeOverRial: T(1_500_000), maxWeightGrams: 60_000 });

export const SHOPS: readonly Shop[] = [
  {
    id: "s1", slug: "باغ-سیب-حاج-رحیم", name: "باغ سیب حاج رحیم", type: "GROWER", cityId: "miandoab", ownerName: "حاج رحیم",
    handlingDays: 1, acceptanceSlaHours: 6, ratingAvg: 4.8, ratingCount: 214, freshnessRatingAvg: 4.9, cancellations90d: 1, joinedYear: 1404, status: "ACTIVE",
    emoji: "🍎", hue: 4, art: "apple-red",
    story: {
      title: "سی سال سیب، کنار زرینه‌رود",
      body: [
        "باغ ما در حاشیه‌ی زرینه‌رود میاندوآب است. پدرم اولین نهال‌های رد دلیشز را سال ۱۳۷۴ کاشت و حالا چهار هکتار باغ داریم.",
        "سیب را دستی می‌چینیم، همان روز درجه‌بندی می‌کنیم و در کارتن‌های پنج‌کیلویی با لایه‌ی مقوایی می‌فرستیم تا ضربه نخورد.",
        "سیب‌های ریز و لک‌دار را دور نمی‌ریزیم؛ با قیمت کمتر و برچسب «آبمیوه‌ای» عرضه می‌کنیم.",
      ],
      practices: ["چیدن دستی", "آبیاری قطره‌ای", "سم‌پاشی فقط زیر نظر کارشناس", "درجه‌بندی در باغ"],
      sinceYear: 1374,
    },
    shipping: [local(25_000), ...intercity()],
  },
  {
    id: "s2", slug: "تاکستان-نوری", name: "تاکستان نوری", type: "GROWER", cityId: "miandoab", ownerName: "برادران نوری",
    handlingDays: 0, acceptanceSlaHours: 4, ratingAvg: 4.7, ratingCount: 96, freshnessRatingAvg: 4.8, cancellations90d: 0, joinedYear: 1404, status: "ACTIVE",
    emoji: "🍇", hue: 85, art: "grape-white",
    story: {
      title: "انگور بی‌دانه‌ی میاندوآب",
      body: [
        "میاندوآب یکی از قطب‌های انگور بی‌دانه‌ی ایران است. تاکستان ما دو نسل است که دست خانواده‌ی نوری است.",
        "انگور را صبح زود و در خنکی هوا می‌چینیم و همان روز ارسال می‌کنیم؛ برای همین فقط به شهرهایی می‌فرستیم که تا دو روز برسد.",
      ],
      practices: ["چیدن صبح زود", "ارسال همان روز", "بدون هورمون رشد"],
      sinceYear: 1368,
    },
    shipping: [local(25_000), ...intercity({ freight: false })],
  },
  {
    id: "s3", slug: "تعاونی-باغداران-ارومیه", name: "تعاونی باغداران ارومیه", type: "COOPERATIVE", cityId: "urmia", ownerName: "هیئت‌مدیره‌ی تعاونی",
    handlingDays: 1, acceptanceSlaHours: 6, ratingAvg: 4.6, ratingCount: 341, freshnessRatingAvg: 4.6, cancellations90d: 3, joinedYear: 1404, status: "ACTIVE",
    emoji: "🌳", hue: 110, art: "apple-yellow",
    story: {
      title: "۴۲ باغدار، یک غرفه",
      body: [
        "تعاونی ما محصول ۴۲ باغدار کوچک اطراف ارومیه را جمع می‌کند، درجه‌بندی می‌کند و با یک نام می‌فروشد.",
        "هر کارتن برچسب نام باغ و تاریخ برداشت دارد تا بدانید سیب شما از کدام باغ آمده است.",
      ],
      practices: ["برچسب باغ روی هر کارتن", "سردخانه‌ی تعاونی", "پرداخت منصفانه به باغدار"],
      sinceYear: 1389,
    },
    shipping: [local(30_000), ...intercity()],
  },
  {
    id: "s4", slug: "میوه-فروشی-سعید", name: "میوه‌فروشی سعید", type: "SHOP", cityId: "urmia", ownerName: "سعید",
    handlingDays: 0, acceptanceSlaHours: 2, ratingAvg: 4.5, ratingCount: 58, freshnessRatingAvg: 4.6, cancellations90d: 2, joinedYear: 1405, status: "ACTIVE",
    emoji: "🧺", hue: 140, art: "herbs",
    story: {
      title: "میوه‌فروشی محله، حالا آنلاین",
      body: [
        "مغازه‌ی ما در خیابان امام ارومیه است. هر روز صبح از میدان بار و باغ‌های اطراف خرید می‌کنیم.",
        "سبزی و صیفی را همان روز در خود ارومیه با پیک خودمان می‌رسانیم.",
      ],
      practices: ["خرید روزانه", "ارسال همان روز در ارومیه"],
      sinceYear: 1396,
    },
    shipping: [local(20_000)],
  },
  {
    id: "s5", slug: "انارستان-ملکی", name: "انارستان ملکی", type: "GROWER", cityId: "saveh", ownerName: "خانواده‌ی ملکی",
    handlingDays: 1, acceptanceSlaHours: 6, ratingAvg: 4.9, ratingCount: 187, freshnessRatingAvg: 4.8, cancellations90d: 0, joinedYear: 1404, status: "ACTIVE",
    emoji: "svg:pomegranate", hue: 350, art: "pomegranate",
    story: {
      title: "انار ساوه، از درخت تا جعبه",
      body: [
        "انار ملس ساوه را همه می‌شناسند. ما انار را روی درخت می‌گذاریم تا کامل برسد و بعد می‌چینیم؛ برای همین دانه‌ها یاقوتی و آبدار است.",
        "انارهای ترک‌خورده را جدا می‌کنیم و فقط انار سالم در جعبه می‌رود.",
      ],
      practices: ["رسیدن کامل روی درخت", "جداسازی انار ترک‌خورده", "کود دامی"],
      sinceYear: 1360,
    },
    shipping: intercity(),
  },
  {
    id: "s6", slug: "باغ-مرکبات-سرسبز", name: "باغ مرکبات سرسبز", type: "GROWER", cityId: "sari", ownerName: "مهندس کریمی",
    handlingDays: 1, acceptanceSlaHours: 6, ratingAvg: 4.6, ratingCount: 122, freshnessRatingAvg: 4.7, cancellations90d: 1, joinedYear: 1404, status: "ACTIVE",
    emoji: "🍊", hue: 30, art: "tangerine",
    story: {
      title: "مرکبات دامنه‌ی البرز",
      body: ["باغ ما در دامنه‌ی جنوب ساری است. نارنگی انشو اولین مرکبات فصل است و از آبان می‌رسد؛ پرتقال تامسون از آذر."],
      practices: ["بدون واکس", "چیدن با قیچی", "انبار با تهویه"],
      sinceYear: 1381,
    },
    shipping: [local(30_000), ...intercity()],
  },
  {
    id: "s7", slug: "کیوی-باغ-آستارا", name: "کیوی‌باغ آستارا", type: "GROWER", cityId: "astara", ownerName: "خانم رضایی",
    handlingDays: 1, acceptanceSlaHours: 6, ratingAvg: 4.7, ratingCount: 64, freshnessRatingAvg: 4.8, cancellations90d: 0, joinedYear: 1405, status: "ACTIVE",
    emoji: "🥝", hue: 78, art: "kiwi",
    story: {
      title: "کیوی کنار دریا",
      body: ["هوای مرطوب آستارا برای کیوی عالی است. کیوی‌های ما سفت چیده می‌شوند تا در راه آسیب نبینند و در خانه‌ی شما برسند."],
      practices: ["بدون سم", "چیدن سفت برای ارسال دور"],
      sinceYear: 1392,
    },
    shipping: intercity(),
  },
  {
    id: "s8", slug: "نخلستان-ارگ-بم", name: "نخلستان ارگ", type: "GROWER", cityId: "bam", ownerName: "حاج کاظم",
    handlingDays: 1, acceptanceSlaHours: 8, ratingAvg: 4.8, ratingCount: 276, freshnessRatingAvg: 4.7, cancellations90d: 1, joinedYear: 1404, status: "ACTIVE",
    emoji: "🌴", hue: 22, art: "dates-mazafati",
    story: {
      title: "مضافتی بم، در سایه‌ی ارگ",
      body: ["نخلستان ما نزدیک ارگ بم است. خرما را بعد از چیدن در سردخانه نگه می‌داریم و در بسته‌های یک و پنج کیلویی می‌فرستیم."],
      practices: ["سردخانه‌ی بعد از برداشت", "بسته‌بندی بهداشتی"],
      sinceYear: 1350,
    },
    shipping: intercity(),
  },
  {
    id: "s9", slug: "تعاونی-صیفی-کاران-جیرفت", name: "تعاونی صیفی‌کاران جیرفت", type: "COOPERATIVE", cityId: "jiroft", ownerName: "تعاونی جیرفت",
    handlingDays: 0, acceptanceSlaHours: 4, ratingAvg: 4.4, ratingCount: 153, freshnessRatingAvg: 4.3, cancellations90d: 4, joinedYear: 1404, status: "ACTIVE",
    emoji: "🍅", hue: 6, art: "tomato",
    story: {
      title: "سبد صیفی ایران در زمستان",
      body: ["از آبان که هوای جیرفت معتدل می‌شود، فصل گوجه و خیار و بادمجان ما شروع می‌شود و تا بهار ادامه دارد."],
      practices: ["کشت فضای باز", "ارسال همان روز"],
      sinceYear: 1385,
    },
    shipping: intercity({ post: false }),
  },
  {
    id: "s10", slug: "زرشک-کاران-قائن", name: "زرشک‌کاران قائن", type: "COOPERATIVE", cityId: "qaen", ownerName: "تعاونی زرشک قائن",
    handlingDays: 2, acceptanceSlaHours: 8, ratingAvg: 4.9, ratingCount: 89, freshnessRatingAvg: 4.9, cancellations90d: 0, joinedYear: 1404, status: "ACTIVE",
    emoji: "svg:barberry", hue: 355, art: "barberry",
    story: {
      title: "زرشک پفکی، خشک‌شده در سایه",
      body: ["زرشک را در سایه خشک می‌کنیم تا رنگ قرمزش بماند. بیشتر زرشک ایران از دشت‌های قائن و بیرجند می‌آید."],
      practices: ["خشک کردن در سایه", "بدون رنگ و افزودنی"],
      sinceYear: 1375,
    },
    shipping: intercity({ freight: false }),
  },
  {
    id: "s11", slug: "مزرعه-کوهپایه-فریدن", name: "مزرعه‌ی کوهپایه فریدن", type: "GROWER", cityId: "fereydan", ownerName: "آقای بختیاری",
    handlingDays: 1, acceptanceSlaHours: 8, ratingAvg: 4.5, ratingCount: 71, freshnessRatingAvg: 4.5, cancellations90d: 1, joinedYear: 1405, status: "ACTIVE",
    emoji: "🥔", hue: 36, art: "potato",
    story: {
      title: "سیب‌زمینی و پیاز برای زمستان",
      body: ["فریدن به سیب‌زمینی معروف است. کیسه‌های ۱۰ و ۲۰ کیلویی ما برای خرید زمستانه‌ی خانواده‌هاست."],
      practices: ["انبار خنک و تاریک", "کیسه‌ی کنفی"],
      sinceYear: 1378,
    },
    shipping: intercity({ post: false }),
  },
  {
    id: "s12", slug: "باغ-به-و-انار-نقده", name: "باغ به و انار نقده", type: "GROWER", cityId: "naqadeh", ownerName: "کاک احمد",
    handlingDays: 1, acceptanceSlaHours: 6, ratingAvg: 4.6, ratingCount: 41, freshnessRatingAvg: 4.7, cancellations90d: 0, joinedYear: 1405, status: "ACTIVE",
    emoji: "🍐", hue: 52, art: "quince",
    story: {
      title: "باغ کوچک خانوادگی",
      body: ["باغ دو هکتاری ما در نقده به، انار و سیب دارد. همه‌چیز را خودمان می‌چینیم و بسته‌بندی می‌کنیم."],
      practices: ["باغ خانوادگی", "بدون سم شیمیایی در سال آخر"],
      sinceYear: 1384,
    },
    shipping: [local(25_000), ...intercity({ freight: false })],
  },
];

export const shopById = (id: string): Shop | undefined => SHOPS.find((s) => s.id === id);
export const shopBySlug = (slug: string): Shop | undefined => SHOPS.find((s) => s.slug === slug || s.id === slug);

export const SHOP_TYPE_FA: Record<Shop["type"], string> = { GROWER: "باغدار", SHOP: "میوه‌فروشی", COOPERATIVE: "تعاونی" };
