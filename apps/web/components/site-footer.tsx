import { Logo } from "@nobar/ui";
import { ArrowLeft, ArrowUpLeft, Leaf } from "lucide-react";
import Link from "next/link";

const COLUMNS: Array<[string, Array<[string, string]>]> = [
  [
    "بازارگردی",
    [
      ["/search", "بازار تازه‌ها"],
      ["/shops", "غرفه‌ها و باغدارها"],
      ["/season", "تقویم فصل‌ها"],
      ["/baghboon", "باغبون"],
    ],
  ],
  [
    "کنارت هستیم",
    [
      ["/faq", "پرسش‌های متداول"],
      ["/orders", "پیگیری سفارش"],
      ["/about/escrow", "پرداخت و بازپرداخت"],
      ["/contact", "ارتباط با نوبر"],
    ],
  ],
  [
    "آشنایی بیشتر",
    [
      ["/about", "قصهٔ نوبر"],
      ["/about/sell", "فروش در نوبر"],
      ["/terms", "قوانین خرید"],
      ["/privacy", "حریم خصوصی"],
    ],
  ],
];

export function SiteFooter() {
  return (
    <footer className="studio-footer">
      <div className="studio-footer-inner">
        <div className="studio-footer-invitation">
          <span>
            <Leaf size={18} /> از باغ، برای زندگی
          </span>
          <h2>
            طعم خوب، آدم‌ها را
            <br />
            به هم نزدیک می‌کند.
          </h2>
          <Link href="/about">
            قصهٔ نوبر را بخوان <ArrowUpLeft size={19} />
          </Link>
        </div>
        <div className="studio-footer-links">
          {COLUMNS.map(([title, links]) => (
            <div key={title}>
              <h3>{title}</h3>
              <ul>
                {links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="studio-footer-seller">
          <Logo subtitle="بازار تازهٔ ایران" />
          <p>
            محصول خوبت را
            <br />
            به سفره‌های بیشتری برسان.
          </p>
          <Link href="/about/sell">
            غرفه‌دار نوبر شو <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
      <div className="studio-footer-bottom">
        <span>© ۱۴۰۵ نوبر · با سلیقه، برای تازگی</span>
        <span>
          نسخهٔ نمایشی · داده‌ها و عکس‌ها نمونه‌اند؛ پرداخت واقعی انجام نمی‌شود.
        </span>
        <Link href="/about/credits">
          منابع تصاویر <ArrowUpLeft size={12} />
        </Link>
      </div>
    </footer>
  );
}
