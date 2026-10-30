import { destinationCities, SHOPS } from "@nobar/demo";
import type { Metadata } from "next";
import Image from "next/image";
import { InfoPage, InfoSection } from "@/components/info-page";
import { bannerSrc } from "@/lib/photos";

export const metadata: Metadata = { title: "درباره‌ی نوبر" };

export default function AboutPage() {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  return (
    <InfoPage
      current="/about"
      title="درباره‌ی نوبر"
      lead="نوبرِ هر شهر، مستقیم از باغ. نوبر بازار آنلاین میوه و سبزی تازه است که باغدارها، تعاونی‌ها و میوه‌فروشی‌های هر شهر را مستقیم به خریدارهای همه‌ی ایران وصل می‌کند."
    >
      <div className="relative aspect-[21/9] overflow-hidden rounded-card">
        <Image src={bannerSrc("banner-harvest")} alt="برداشت انار" fill sizes="(max-width: 1024px) 100vw, 800px" className="object-cover" />
      </div>
      <InfoSection title="مسئله">
        <p>
          میوه و سبزی در ایران از باغ تا سفره از سه تا چهار واسطه می‌گذرد. بخش بزرگی از محصول پیش از رسیدن به مصرف‌کننده از بین می‌رود، قیمت سر باغ تا مغازه چند برابر
          می‌شود و خریدار نمی‌داند محصول کی و کجا برداشت شده است.
        </p>
      </InfoSection>
      <InfoSection title="راه‌حل نوبر">
        <ul className="list-disc space-y-1 ps-5">
          <li>تاریخ برداشت روی هر محصول و نشان تازگی (تازه‌چین، تازه، مناسب)؛ محصول کهنه خودکار از فروش خارج می‌شود.</li>
          <li>هر محصول فقط به شهرهایی عرضه می‌شود که تازه به آن‌ها برسد، با زمان رسیدن واقعی.</li>
          <li>قیمت تمام‌شده‌ی هر کیلو تا درِ خانه، همراه هزینه‌ی ارسال، و مقایسه‌ی منصفانه‌ی غرفه‌ها.</li>
          <li>پرداخت امن: پول خریدار تا پایان مهلت شکایت نزد نوبر امانت می‌ماند.</li>
          <li>باغ‌نامه: داستان هر باغ با عکس واقعی؛ و «نوبر شد!» برای اولین محصول هر فصل.</li>
        </ul>
      </InfoSection>
      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ["غرفه‌ی نمونه", fa(SHOPS.length)],
          ["شهر مقصد", fa(destinationCities().length)],
          ["شروع آزمایشی", "آذربایجان غربی"],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col-reverse rounded-card bg-surface-2 p-4">
            <dt className="text-xs text-ink-soft">{k}</dt>
            <dd className="text-xl font-black text-brand-strong">{v}</dd>
          </div>
        ))}
      </dl>
      <InfoSection title="سازنده">
        <p>نوبر پروژه‌ی سالار دلکش است. این نسخه‌ی نمایشیِ رابط کاربری است و داده‌ها، عکس‌ها و پرداخت در آن نمونه است.</p>
      </InfoSection>
    </InfoPage>
  );
}
