import type { Metadata } from "next";
import { DraftNote, InfoPage, InfoSection } from "@/components/info-page";

export const metadata: Metadata = { title: "حریم خصوصی" };

export default function PrivacyPage() {
  return (
    <InfoPage current="/privacy" title="حریم خصوصی">
      <DraftNote />
      <InfoSection title="چه اطلاعاتی نگه می‌داریم">
        <p>شماره‌ی موبایل برای ورود، نام و آدرس برای تحویل سفارش، و سابقه‌ی سفارش‌ها برای پیگیری و بازپرداخت.</p>
      </InfoSection>
      <InfoSection title="چه چیزی را هرگز ثبت نمی‌کنیم">
        <p>کد ورود پیامکی، شماره‌ی کامل موبایل، آدرس، کد ملی و شماره‌ی شبا در گزارش‌های فنی ثبت نمی‌شوند. اطلاعات هویتی غرفه‌داران رمزگذاری می‌شود و فقط کارشناس مالی به آن دسترسی دارد.</p>
      </InfoSection>
      <InfoSection title="عکس‌ها و صدا">
        <p>اطلاعات مکانی از عکس‌های بارگذاری‌شده پاک می‌شود. پیام صوتی که برای جستجو یا ثبت محصول می‌فرستید، بعد از تبدیل به متن حذف می‌شود.</p>
      </InfoSection>
      <InfoSection title="باغبون">
        <p>گفت‌وگوهایی که اطلاعات شخصی دارند در گزارش‌ها ثبت نمی‌شوند و باغبون بدون تأیید شما در سبد خرید تغییری نمی‌دهد.</p>
      </InfoSection>
      <InfoSection title="این نسخه‌ی نمایشی">
        <p>در این نسخه همه‌ی اطلاعات فقط در مرورگر خود شما ذخیره می‌شود و به هیچ سروری فرستاده نمی‌شود.</p>
      </InfoSection>
    </InfoPage>
  );
}
