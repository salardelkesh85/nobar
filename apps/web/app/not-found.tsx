import { ButtonLink, EmptyState } from "@nobar/ui";

export default function NotFound() {
  return (
    <EmptyState
      icon={<span aria-hidden>🍂</span>}
      title="این صفحه پیدا نشد"
      body="شاید محصولش تمام شده یا نشانی اشتباه است."
      action={<ButtonLink href="/">بازگشت به نوبر</ButtonLink>}
    />
  );
}
