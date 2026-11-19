import { BrandLogo } from "@nobar/ui";
import { ArrowLeft, BadgeCheck, ChevronUp, Headset, ShieldCheck, Smartphone, Truck, Wallet } from "lucide-react";
import Link from "next/link";

const COLUMNS: Array<[string, Array<[string, string]>]> = [
  [
    "با نوبر",
    [
      ["/about", "درباره‌ی نوبر"],
      ["/about/sell", "فروش در نوبر"],
      ["/shops", "غرفه‌ها و باغدارها"],
      ["/contact", "تماس با ما"],
    ],
  ],
  [
    "خدمات مشتریان",
    [
      ["/faq", "پرسش‌های متداول"],
      ["/orders", "پیگیری سفارش"],
      ["/about/escrow", "پرداخت امانی و بازپرداخت"],
      ["/terms", "قوانین خرید"],
      ["/privacy", "حریم خصوصی"],
    ],
  ],
  [
    "راهنمای خرید",
    [
      ["/search", "همه‌ی محصولات"],
      ["/categories", "دسته‌بندی‌ها"],
      ["/season", "تقویم فصل"],
      ["/compare", "مقایسه‌ی غرفه‌ها"],
      ["/baghboon", "باغبون، دستیار خرید"],
    ],
  ],
];

const PROMISES = [
  { icon: Truck, title: "تازه می‌رسد", body: "فقط محصولی که تازه به شهر شما برسد" },
  { icon: Wallet, title: "قیمت تمام‌شده", body: "کالا و ارسال، پیش از خرید" },
  { icon: ShieldCheck, title: "پول در امانت", body: "تا تحویل و پایان مهلت شکایت" },
  { icon: BadgeCheck, title: "فروشنده‌ی تأییدشده", body: "با مدارک هویتی، پیش از فروش" },
  { icon: Headset, title: "پیگیری سفارش", body: "از پرداخت تا تحویل، در حساب شما" },
];

/** Link to the Android app's download page; the block is hidden when it is not set. */
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL;

export function SiteFooter() {
  return (
    <footer className="nx-footer">
      <div className="nx-footer-inner">
        <div className="nx-footer-top">
          <Link href="/" className="nx-footer-brand" aria-label="نوبر — صفحه‌ی اصلی">
            <BrandLogo height={40} />
            <small>از باغ تا سفره</small>
          </Link>
          <a href="#main" className="nx-footer-totop">
            بازگشت به بالا <ChevronUp className="size-4" aria-hidden />
          </a>
        </div>

        <ul className="nx-footer-promises">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <span className="nx-footer-promise-icon" aria-hidden>
                <Icon className="size-6" strokeWidth={1.6} />
              </span>
              <strong>{title}</strong>
              <span>{body}</span>
            </li>
          ))}
        </ul>

        <div className="nx-footer-grid">
          {COLUMNS.map(([title, links]) => (
            <nav key={title} aria-label={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="nx-footer-side">
            <div className="nx-footer-seller">
              <h2>باغ یا مغازه‌ی میوه دارید؟</h2>
              <p>محصول‌تان را مستقیم به خریدارهای سراسر ایران بفروشید.</p>
              <Link href="/about/sell">
                غرفه‌دار نوبر شوید <ArrowLeft className="size-4" aria-hidden />
              </Link>
            </div>
            {ANDROID_URL ? (
              <a href={ANDROID_URL} className="nx-footer-app" rel="noopener">
                <Smartphone className="size-6" strokeWidth={1.6} aria-hidden />
                <span>
                  <strong>اپلیکیشن اندروید نوبر</strong>
                  <small>دریافت فایل نصب</small>
                </span>
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="nx-footer-bottom">
        <div>
          <span>© ۱۴۰۵ نوبر</span>
          <span>نسخه‌ی نمایشی: داده‌ها و عکس‌ها نمونه‌اند و پرداخت واقعی انجام نمی‌شود.</span>
          <Link href="/about/credits">منابع تصاویر</Link>
        </div>
      </div>
    </footer>
  );
}
