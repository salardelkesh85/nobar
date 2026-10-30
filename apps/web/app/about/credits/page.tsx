import type { Metadata } from "next";
import credits from "@/lib/photo-credits.json";

export const metadata: Metadata = { title: "منابع عکس‌ها" };

export default function CreditsPage() {
  const rows = Object.entries(credits as Record<string, { title: string; artist: string; license: string; source: string }>);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-black">منابع عکس‌ها</h1>
      <p className="leading-8 text-ink-soft">
        عکس‌های این نسخه‌ی نمایشی از ویکی‌مدیا کامنز با مجوز آزاد برداشته شده‌اند و فقط جای عکس‌های واقعی غرفه‌دارها را نگه می‌دارند. در نسخه‌ی واقعی، هر محصول با عکس خود غرفه‌دار نمایش داده می‌شود.
      </p>
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full min-w-[36rem] text-sm" dir="ltr">
          <thead className="bg-surface-2 text-ink-soft">
            <tr>
              <th scope="col" className="p-3 text-start">File</th>
              <th scope="col" className="p-3 text-start">Author</th>
              <th scope="col" className="p-3 text-start">License</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, c]) => (
              <tr key={key} className="border-t border-line">
                <td className="p-3">
                  <a href={c.source} className="text-brand hover:underline" rel="noopener noreferrer">
                    {c.title}
                  </a>
                </td>
                <td className="p-3">{c.artist || "—"}</td>
                <td className="p-3">{c.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
