import { ProduceDefs } from "@nobar/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { SellerProvider } from "@/lib/state";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "پنل غرفه‌دار نوبر", template: "%s | پنل غرفه‌دار نوبر" },
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#14532d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <ProduceDefs />
        <SellerProvider>
          <Shell>{children}</Shell>
        </SellerProvider>
      </body>
    </html>
  );
}
