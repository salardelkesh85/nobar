import {
  cityName,
  LISTINGS,
  ratingBayes,
  SHOP_TYPE_FA,
  SHOPS,
} from "@nobar/demo";
import { ArrowUpLeft, BadgeCheck, MapPin, Star } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Photo } from "@/components/photo";
import { PageIntro } from "@/components/page-intro";
import { bannerSrc, type BannerPhoto } from "@/lib/photos";

export const metadata: Metadata = { title: "غرفه‌ها" };
const cover = (art: string): BannerPhoto =>
  ["apple-red", "apple-yellow", "grape-white", "walnut"].includes(art)
    ? "banner-orchard"
    : ["pomegranate", "barberry", "quince"].includes(art)
      ? "banner-pomegranate"
      : "banner-market";

export default function ShopsPage() {
  const shops = [...SHOPS]
    .filter((s) => s.status === "ACTIVE")
    .sort((a, b) => ratingBayes(b) - ratingBayes(a));
  return (
    <div>
      <PageIntro
        eyebrow="آدم‌های پشت طعم خوب"
        title="از آشنایی تا اعتماد."
        description="باغدارها و غرفه‌دارهای نوبر را بشناس؛ محصول خوب، از یک قصهٔ واقعی شروع می‌شود."
      >
        <div className="studio-intro-count">
          <strong>{shops.length.toLocaleString("fa-IR")}</strong>
          <span>غرفهٔ فعال، به ترتیب امتیاز</span>
        </div>
      </PageIntro>
      <ul className="studio-shops-directory">
        {shops.map((s) => (
          <li key={s.id}>
            <Link href={`/shop/${s.id}`} className="studio-seller-card">
              <div className="studio-seller-cover">
                <Image
                  src={bannerSrc(cover(s.art))}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <span>{SHOP_TYPE_FA[s.type]}</span>
              </div>
              <div className="studio-seller-info">
                <Photo
                  kind={s.art}
                  alt=""
                  sizes="64px"
                  className="studio-seller-avatar"
                />
                <span className="studio-seller-score">
                  <Star size={13} fill="currentColor" />
                  {s.ratingAvg.toLocaleString("fa-IR")}
                  <small>({s.ratingCount.toLocaleString("fa-IR")} نظر)</small>
                </span>
                <h2>
                  {s.name}
                  <BadgeCheck size={17} />
                </h2>
                <p>
                  <MapPin size={13} />
                  {cityName(s.cityId)}
                  <span>·</span>
                  {LISTINGS.filter(
                    (l) => l.shopId === s.id && l.status === "PUBLISHED",
                  ).length.toLocaleString("fa-IR")}{" "}
                  محصول
                </p>
                <div className="studio-seller-story">
                  <span>{s.story.title}</span>
                  <ArrowUpLeft size={19} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
