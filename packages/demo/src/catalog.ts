import type { Category, ProduceType } from "./types";

export const CATEGORIES: readonly Category[] = [
  { id: "fruit", slug: "میوه", name: "میوه", emoji: "🍎", art: "apple-red" },
  { id: "citrus", slug: "مرکبات", name: "مرکبات", emoji: "🍊", art: "orange" },
  { id: "veg", slug: "صیفی-و-سبزیجات", name: "صیفی و سبزیجات", emoji: "🍅", art: "tomato" },
  { id: "greens", slug: "سبزی-برگی", name: "سبزی برگی", emoji: "🌿", art: "herbs" },
  { id: "dried", slug: "خشکبار-و-خرما", name: "خشکبار و خرما", emoji: "🌰", art: "walnut" },
];

type Seed = Omit<ProduceType, "minShelfDaysOnArrival" | "complaintWindowHours" | "needsReview"> &
  Partial<Pick<ProduceType, "minShelfDaysOnArrival" | "complaintWindowHours">>;

// Values are approximate and marked needs_review until staff confirm them (docs/02 §17).
const SEED: Seed[] = [
  { id: "apple-red", slug: "سیب-قرمز", name: "سیب قرمز", categoryId: "fruit", aliases: ["سیب", "سیب سرخ", "رد دلیشز", "سیب لبنانی"], unitKind: "WEIGHT", shelfLifeDays: 30, storage: "COOL", months: [6, 7, 8, 9, 10], peakMonths: [7, 8], storageTips: "در یخچال و دور از موز نگه دارید؛ سیب گاز اتیلن می‌دهد و میوه‌های کنارش را زودتر می‌رساند.", emoji: "🍎", hue: 2 },
  { id: "apple-yellow", slug: "سیب-زرد", name: "سیب زرد", categoryId: "fruit", aliases: ["سیب", "گلدن", "سیب گلدن", "سیب ترش"], unitKind: "WEIGHT", shelfLifeDays: 28, storage: "COOL", months: [6, 7, 8, 9, 10], peakMonths: [7, 8], storageTips: "در کیسه‌ی سوراخ‌دار در طبقه‌ی میوه‌ی یخچال نگه دارید.", emoji: "🍏", hue: 62 },
  { id: "pomegranate", slug: "انار", name: "انار", categoryId: "fruit", aliases: ["انار ملس", "انار ترش", "انار شیرین", "انار ساوه"], unitKind: "WEIGHT", shelfLifeDays: 40, storage: "COOL", months: [7, 8, 9], peakMonths: [7, 8], storageTips: "انار پوست‌دار تا چند هفته در جای خنک می‌ماند؛ دانه‌ها را در ظرف دربسته فریز کنید.", emoji: "svg:pomegranate", hue: 350 },
  { id: "grape-white", slug: "انگور-سفید", name: "انگور سفید بی‌دانه", categoryId: "fruit", aliases: ["انگور", "انگور بیدانه", "انگور سفید", "انگور کشمشی", "بی دانه"], unitKind: "WEIGHT", shelfLifeDays: 8, storage: "COOL", months: [5, 6, 7, 8], peakMonths: [6], storageTips: "نشسته و در کیسه‌ی کاغذی در یخچال نگه دارید و فقط پیش از مصرف بشویید.", emoji: "🍇", hue: 85 },
  { id: "grape-black", slug: "انگور-سیاه", name: "انگور سیاه", categoryId: "fruit", aliases: ["انگور", "انگور رشه", "انگور قرمز", "انگور یاقوتی"], unitKind: "WEIGHT", shelfLifeDays: 8, storage: "COOL", months: [6, 7, 8], peakMonths: [7], storageTips: "خوشه‌ها را روی هم فشار ندهید؛ در یخچال تا یک هفته می‌ماند.", emoji: "🍇", hue: 285 },
  { id: "quince", slug: "به", name: "به", categoryId: "fruit", aliases: ["به", "بِه", "میوه به", "به اصفهان"], unitKind: "WEIGHT", shelfLifeDays: 30, storage: "COOL", months: [7, 8, 9], peakMonths: [8], storageTips: "در جای خنک و خشک، جدا از میوه‌های دیگر نگه دارید؛ عطرش به آن‌ها می‌رود.", emoji: "🍐", hue: 52 },
  { id: "persimmon", slug: "خرمالو", name: "خرمالو", categoryId: "fruit", aliases: ["خرمالو", "خرما لو", "کاکی"], unitKind: "WEIGHT", shelfLifeDays: 10, storage: "COOL", months: [8, 9], peakMonths: [8], storageTips: "خرمالوی سفت را در دمای اتاق کنار سیب بگذارید تا برسد؛ رسیده را در یخچال.", emoji: "svg:persimmon", hue: 24 },
  { id: "kiwi", slug: "کیوی", name: "کیوی", categoryId: "fruit", aliases: ["کیوی", "کیوی آستارا", "کیوی شمال"], unitKind: "WEIGHT", shelfLifeDays: 35, storage: "COOL", months: [8, 9, 10, 11], peakMonths: [9], storageTips: "کیوی سفت ماه‌ها در یخچال می‌ماند؛ برای رسیدن، چند روز بیرون بگذارید.", emoji: "🥝", hue: 78 },
  { id: "tangerine", slug: "نارنگی", name: "نارنگی", categoryId: "citrus", aliases: ["نارنگی", "نارنگی انشو", "نارنگی پیج", "نارنگی شمال"], unitKind: "WEIGHT", shelfLifeDays: 18, storage: "COOL", months: [8, 9, 10, 11], peakMonths: [9, 10], storageTips: "در جای خنک و با تهویه نگه دارید؛ کیسه‌ی نایلونی دربسته کپک می‌زند.", emoji: "🍊", hue: 30 },
  { id: "orange", slug: "پرتقال", name: "پرتقال", categoryId: "citrus", aliases: ["پرتقال", "پرتقال تامسون", "پرتقال خونی", "پرتغال"], unitKind: "WEIGHT", shelfLifeDays: 25, storage: "COOL", months: [9, 10, 11, 12], peakMonths: [10, 11], storageTips: "در طبقه‌ی پایین یخچال تا سه هفته تازه می‌ماند.", emoji: "🍊", hue: 34 },
  { id: "sweet-lime", slug: "لیموشیرین", name: "لیموشیرین", categoryId: "citrus", aliases: ["لیمو شیرین", "لیموشیرین"], unitKind: "WEIGHT", shelfLifeDays: 20, storage: "COOL", months: [8, 9, 10], peakMonths: [9], storageTips: "در جای خنک نگه دارید؛ آبش را تازه بگیرید، بعد از نیم ساعت تلخ می‌شود.", emoji: "🍋", hue: 58 },
  { id: "dates-mazafati", slug: "خرما-مضافتی", name: "خرمای مضافتی", categoryId: "dried", aliases: ["خرما", "مضافتی", "خرمای بم", "رطب"], unitKind: "WEIGHT", shelfLifeDays: 60, storage: "COOL", months: [6, 7, 8, 9, 10, 11, 12], peakMonths: [6, 7], storageTips: "در ظرف دربسته در یخچال؛ برای چند ماه فریز کنید.", emoji: "🌴", hue: 22, complaintWindowHours: 48 },
  { id: "walnut", slug: "گردو", name: "گردوی تازه", categoryId: "dried", aliases: ["گردو", "مغز گردو", "گردو تازه"], unitKind: "WEIGHT", shelfLifeDays: 90, storage: "AMBIENT", months: [6, 7, 8, 9], peakMonths: [7], storageTips: "گردوی با پوست را در جای خشک و خنک نگه دارید؛ مغز را در یخچال.", emoji: "🌰", hue: 30, complaintWindowHours: 48 },
  { id: "barberry", slug: "زرشک", name: "زرشک پفکی", categoryId: "dried", aliases: ["زرشک", "زرشک قائن", "زرشک پفکی"], unitKind: "WEIGHT", shelfLifeDays: 180, storage: "AMBIENT", months: [7, 8, 9], peakMonths: [8], storageTips: "در فریزر نگه دارید تا رنگ و ترشی‌اش بماند.", emoji: "svg:barberry", hue: 355, complaintWindowHours: 48, minShelfDaysOnArrival: 30 },
  { id: "tomato", slug: "گوجه-فرنگی", name: "گوجه‌فرنگی", categoryId: "veg", aliases: ["گوجه", "گوجه فرنگی", "گوجه‌فرنگی", "گوجه جیرفت"], unitKind: "WEIGHT", shelfLifeDays: 8, storage: "AMBIENT", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], peakMonths: [4, 5], storageTips: "تا وقتی کاملاً نرسیده، بیرون از یخچال نگه دارید.", emoji: "🍅", hue: 6 },
  { id: "cucumber", slug: "خیار", name: "خیار", categoryId: "veg", aliases: ["خیار", "خیار سبز", "خیار گلخانه‌ای", "خیار رسمی"], unitKind: "WEIGHT", shelfLifeDays: 7, storage: "COOL", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], peakMonths: [3, 4], storageTips: "در حوله‌ی کاغذی بپیچید و در کشوی سبزی یخچال بگذارید.", emoji: "🥒", hue: 110 },
  { id: "eggplant", slug: "بادمجان", name: "بادمجان", categoryId: "veg", aliases: ["بادمجون", "بادنجان", "بادمجان قلمی"], unitKind: "WEIGHT", shelfLifeDays: 7, storage: "COOL", months: [4, 5, 6, 7, 8, 9], peakMonths: [5, 6], storageTips: "در جای خنک، نه خیلی سرد؛ زیر ۸ درجه زود قهوه‌ای می‌شود.", emoji: "🍆", hue: 280 },
  { id: "potato", slug: "سیب-زمینی", name: "سیب‌زمینی", categoryId: "veg", aliases: ["سیب زمینی", "سیبزمینی", "سیب‌زمینی فریدن"], unitKind: "WEIGHT", shelfLifeDays: 60, storage: "AMBIENT", months: [5, 6, 7, 8, 9, 10], peakMonths: [7, 8], storageTips: "در جای تاریک و خنک و دور از پیاز نگه دارید تا جوانه نزند.", emoji: "🥔", hue: 36, complaintWindowHours: 48 },
  { id: "onion", slug: "پیاز", name: "پیاز", categoryId: "veg", aliases: ["پیاز زرد", "پیاز قرمز", "پیاز سفید"], unitKind: "WEIGHT", shelfLifeDays: 60, storage: "AMBIENT", months: [3, 4, 5, 6, 7, 8, 9], peakMonths: [4, 5], storageTips: "در توری و جای خشک و پرهوا نگه دارید.", emoji: "🧅", hue: 40, complaintWindowHours: 48 },
  { id: "pumpkin", slug: "کدو-حلوایی", name: "کدو حلوایی", categoryId: "veg", aliases: ["کدو", "کدوحلوایی", "کدو تنبل"], unitKind: "WEIGHT", shelfLifeDays: 45, storage: "AMBIENT", months: [7, 8, 9], peakMonths: [8], storageTips: "کدوی دست‌نخورده ماه‌ها در جای خنک می‌ماند؛ برش‌خورده را در یخچال.", emoji: "🎃", hue: 28 },
  { id: "herbs", slug: "سبزی-خوردن", name: "سبزی خوردن", categoryId: "greens", aliases: ["سبزی", "سبزی خوردن", "ریحان", "تره", "سبزی تازه"], unitKind: "BUNCH", shelfLifeDays: 3, storage: "COOL", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], peakMonths: [1, 2, 3], storageTips: "نشسته، در حوله‌ی کاغذی نم‌دار و ظرف دربسته در یخچال.", emoji: "🌿", hue: 125, minShelfDaysOnArrival: 1 },
  { id: "spinach", slug: "اسفناج", name: "اسفناج", categoryId: "greens", aliases: ["اسفناج", "اسفناج تازه"], unitKind: "BUNCH", shelfLifeDays: 4, storage: "COOL", months: [8, 9, 10, 11, 12, 1], peakMonths: [9, 10], storageTips: "برگ‌های خراب را جدا کنید و در ظرف دربسته در یخچال بگذارید.", emoji: "🥬", hue: 135, minShelfDaysOnArrival: 1 },
  // Out of season now — used by the season calendar.
  { id: "cherry", slug: "گیلاس", name: "گیلاس", categoryId: "fruit", aliases: ["گیلاس", "گیلاس ارومیه", "گیلاس تکدانه"], unitKind: "WEIGHT", shelfLifeDays: 5, storage: "COOL", months: [3, 4], peakMonths: [3], storageTips: "با دم و نشسته در یخچال؛ زود مصرف کنید.", emoji: "🍒", hue: 345 },
  { id: "strawberry", slug: "توت-فرنگی", name: "توت‌فرنگی", categoryId: "fruit", aliases: ["توت فرنگی", "توتفرنگی"], unitKind: "WEIGHT", shelfLifeDays: 3, storage: "COLD", months: [2, 3, 4], peakMonths: [2], storageTips: "تک‌لایه در ظرف و در یخچال؛ فقط پیش از مصرف بشویید.", emoji: "🍓", hue: 352 },
  { id: "apricot", slug: "زردآلو", name: "زردآلو", categoryId: "fruit", aliases: ["زرد آلو", "زردالو"], unitKind: "WEIGHT", shelfLifeDays: 5, storage: "COOL", months: [3, 4], peakMonths: [4], storageTips: "در دمای اتاق می‌رسد؛ رسیده را در یخچال بگذارید.", emoji: "🍑", hue: 36 },
  { id: "peach", slug: "هلو", name: "هلو و شلیل", categoryId: "fruit", aliases: ["هلو", "شلیل", "هلو انجیری"], unitKind: "WEIGHT", shelfLifeDays: 6, storage: "COOL", months: [4, 5, 6], peakMonths: [5], storageTips: "روی هم نچینید؛ رسیده را در یخچال نگه دارید.", emoji: "🍑", hue: 18 },
  { id: "greengage", slug: "گوجه-سبز", name: "گوجه‌سبز", categoryId: "fruit", aliases: ["گوجه سبز", "آلوچه"], unitKind: "WEIGHT", shelfLifeDays: 5, storage: "COOL", months: [1, 2], peakMonths: [1], storageTips: "در یخچال تا چند روز ترد می‌ماند.", emoji: "🫒", hue: 95 },
  { id: "green-almond", slug: "چغاله-بادام", name: "چغاله‌بادام", categoryId: "fruit", aliases: ["چغاله", "چاقاله"], unitKind: "WEIGHT", shelfLifeDays: 5, storage: "COOL", months: [1, 2], peakMonths: [1], storageTips: "در کیسه‌ی دربسته در یخچال.", emoji: "🌱", hue: 100 },
  { id: "watermelon", slug: "هندوانه", name: "هندوانه", categoryId: "fruit", aliases: ["هندونه", "هندوانه"], unitKind: "WEIGHT", shelfLifeDays: 14, storage: "AMBIENT", months: [4, 5, 6], peakMonths: [5], storageTips: "درسته در جای خنک؛ برش‌خورده را با سلفون در یخچال.", emoji: "🍉", hue: 130 },
  { id: "fig", slug: "انجیر", name: "انجیر", categoryId: "fruit", aliases: ["انجیر تازه", "انجیر استهبان"], unitKind: "WEIGHT", shelfLifeDays: 3, storage: "COLD", months: [5, 6], peakMonths: [5], storageTips: "بسیار حساس است؛ همان روز مصرف کنید یا در یخچال بگذارید.", emoji: "svg:fig", hue: 300 },
];

export const PRODUCE_TYPES: readonly ProduceType[] = SEED.map((s) => ({
  minShelfDaysOnArrival: 2,
  complaintWindowHours: 24,
  needsReview: true,
  ...s,
}));

export const produceTypeById = (id: string): ProduceType | undefined => PRODUCE_TYPES.find((p) => p.id === id);
export const produceTypeBySlug = (slug: string): ProduceType | undefined => PRODUCE_TYPES.find((p) => p.slug === slug || p.id === slug);
export const categoryById = (id: string): Category | undefined => CATEGORIES.find((c) => c.id === id);
export const categoryBySlug = (slug: string): Category | undefined => CATEGORIES.find((c) => c.slug === slug);

export const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"] as const;
