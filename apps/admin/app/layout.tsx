import { ProduceDefs } from "@nobar/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "مدیریت نوبر", template: "%s | مدیریت نوبر" },
  robots: { index: false },
};

// Demo data is relative to "now"; render per request so deadlines and dates stay current.
export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#14532d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <ProduceDefs />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
