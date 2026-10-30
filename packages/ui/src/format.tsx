import {
  formatFaNumber,
  formatJalaliDate,
  formatJalaliDateTime,
  formatJalaliShort,
  formatToman,
  formatTomanShort,
  formatWeight,
  relativeDayFa,
} from "@nobar/fa";

/** Numbers, money, weights and dates are rendered only through these components. */

export function Num({ value, className }: { value: number; className?: string }) {
  return <span className={className}>{formatFaNumber(value)}</span>;
}

export function Toman({ rial, short, unit = true, className }: { rial: number; short?: boolean; unit?: boolean; className?: string }) {
  const text = short ? formatTomanShort(rial) : formatToman(rial, { unit });
  return <span className={["whitespace-nowrap tabular-nums", className].filter(Boolean).join(" ")}>{text}</span>;
}

export function Weight({ grams, className }: { grams: number; className?: string }) {
  return <span className={["whitespace-nowrap", className].filter(Boolean).join(" ")}>{formatWeight(grams)}</span>;
}

export function JalaliDate({
  date,
  format = "date",
  className,
}: {
  date: Date | string;
  format?: "date" | "short" | "datetime";
  className?: string;
}) {
  const text = format === "short" ? formatJalaliShort(date) : format === "datetime" ? formatJalaliDateTime(date) : formatJalaliDate(date);
  return (
    <time dateTime={new Date(date).toISOString()} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}

export function RelativeDay({ date, className }: { date: Date | string; className?: string }) {
  return (
    <time dateTime={new Date(date).toISOString()} className={className} suppressHydrationWarning>
      {relativeDayFa(date)}
    </time>
  );
}
