import { ArrowUpLeft, Sprout } from "lucide-react";
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
    <footer className="fresh-footer">
      <div className="fresh-footer-top">
        <div>
          <span>
            <Sprout size={20} /> یک بازار، هزار قصهٔ تازه
          </span>
          <h2>
            به یک زندگی تازه‌تر،
            <br />
            سلام کن.
          </h2>
        </div>
        <Link href="/search">
          از بازار شروع کن <ArrowUpLeft size={25} />
        </Link>
      </div>
      <div className="fresh-footer-body">
        <div className="fresh-footer-note">
          <span className="fresh-footer-word">
            نوبر<span aria-hidden>✳</span>
          </span>
          <p>
            از خاک خوب، به حال خوب.
            <br />
            بازار آنلاین میوه و سبزی، با شناخت آدم‌ها و مبدأها.
          </p>
          <Link href="/about/sell">
            محصولت را به سفره‌های بیشتری برسان <ArrowUpLeft size={17} />
          </Link>
        </div>
        <div className="fresh-footer-links">
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
      </div>
      <div className="fresh-footer-bottom">
        <span>© ۱۴۰۵ نوبر · خوب بخور، تازه زندگی کن</span>
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
