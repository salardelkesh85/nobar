import { CATEGORIES } from "@nobar/demo";
import { ButtonLink } from "@nobar/ui";
import Link from "next/link";
import { Photo } from "@/components/photo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-12 text-center">
      <p className="text-6xl font-black text-brand">۴۰۴</p>
      <h1 className="text-xl font-extrabold">این صفحه پیدا نشد</h1>
      <p className="text-ink-soft">شاید محصولش تمام شده، فصلش گذشته یا نشانی اشتباه است.</p>
      <ButtonLink href="/">بازگشت به صفحه‌ی اصلی</ButtonLink>
      <ul className="mt-4 grid w-full grid-cols-5 gap-2">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link href={`/search?cat=${c.id}`} className="flex flex-col items-center gap-1 text-xs font-bold hover:text-brand">
              <Photo kind={c.art} alt="" sizes="56px" className="size-14 rounded-full" />
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
