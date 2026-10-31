import { ArrowUpLeft, Sprout } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  href?: string;
  action?: string;
}) {
  return (
    <header className="studio-intro">
      <div>
        <span className="studio-eyebrow">
          <Sprout size={16} />
          {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{description}</p>
        {href && action ? (
          <Link href={href}>
            {action}
            <ArrowUpLeft size={18} />
          </Link>
        ) : null}
      </div>
      {children ? <div className="studio-intro-detail">{children}</div> : null}
    </header>
  );
}
