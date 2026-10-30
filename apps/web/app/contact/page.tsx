"use client";

import { Button, Field, Input, Select, Textarea } from "@nobar/ui";
import { Clock, MessageCircle, Receipt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { InfoPage } from "@/components/info-page";
import { useStore } from "@/lib/store";

export default function ContactPage() {
  const { showToast } = useStore();
  const [sent, setSent] = useState(false);
  return (
    <InfoPage current="/contact" title="تماس با ما" lead="پیش از تماس، شاید پاسخ پرسش شما در «سؤالات متداول» باشد.">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Receipt, title: "پیگیری سفارش", body: "از «سفارش‌ها» وضعیت هر غرفه را ببینید.", href: "/orders" },
          { icon: MessageCircle, title: "گزارش مشکل سفارش", body: "از صفحه‌ی همان سفارش، با عکس گزارش دهید.", href: "/orders" },
          { icon: Clock, title: "ساعت پاسخ‌گویی", body: "هر روز ۸ صبح تا ۲۲ (در نسخه‌ی واقعی).", href: "/faq" },
        ].map(({ icon: Icon, title, body, href }) => (
          <Link key={title} href={href} className="rounded-card border border-line p-4 hover:border-brand">
            <Icon className="size-6 text-brand" aria-hidden />
            <p className="mt-2 font-bold">{title}</p>
            <p className="text-sm text-ink-soft">{body}</p>
          </Link>
        ))}
      </div>
      {sent ? (
        <p className="rounded-card bg-brand-soft p-4 font-bold text-brand-strong">پیام شما ثبت شد. (نسخه‌ی نمایشی: پیامی ارسال نمی‌شود.)</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            showToast("پیام شما ثبت شد.");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام" htmlFor="c-name">
              <Input id="c-name" required autoComplete="name" />
            </Field>
            <Field label="شماره‌ی موبایل" htmlFor="c-phone">
              <Input id="c-phone" required inputMode="tel" dir="ltr" className="text-end" />
            </Field>
          </div>
          <Field label="موضوع" htmlFor="c-topic">
            <Select id="c-topic">
              <option>سفارش و ارسال</option>
              <option>پرداخت و بازپرداخت</option>
              <option>غرفه‌داری</option>
              <option>پیشنهاد و انتقاد</option>
            </Select>
          </Field>
          <Field label="پیام" htmlFor="c-msg">
            <Textarea id="c-msg" rows={4} required />
          </Field>
          <Button type="submit">ارسال پیام</Button>
        </form>
      )}
    </InfoPage>
  );
}
