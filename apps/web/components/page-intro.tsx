import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Page heading panel: a title, one line of description, an optional link and an optional detail on the far side. */
export function PageIntro({
  title,
  description,
  children,
  href,
  action,
}: {
  /** kept for callers that still pass it; no longer shown */
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <header className="nx-pagehead">
      <div className="nx-pagehead-text">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {children ? <div className="nx-pagehead-detail">{children}</div> : null}
      {href && action ? (
        <Link href={href} className="nx-pagehead-link">
          {action} <ArrowLeft className="size-4" aria-hidden />
        </Link>
      ) : null}
    </header>
  );
}
