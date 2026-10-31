"use client";

import {
  CATEGORIES,
  cityName,
  currentMonth,
  inSeason,
  isNobar,
  ratingBayes,
  search,
  SHOPS,
  type SearchHit,
} from "@nobar/demo";
import {
  ArrowLeft,
  ArrowUpLeft,
  Check,
  Leaf,
  MapPin,
  MoveUpLeft,
  Sprout,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { bannerSrc } from "@/lib/photos";
import { useStore } from "@/lib/store";
import styles from "./fresh.module.css";

const COLLECTIONS = [
  {
    id: "fruit",
    title: "میوه‌های فصل",
    note: "رنگِ تازهٔ روزت",
    photo: "tangerine",
    href: "/search?cat=fruit",
  },
  {
    id: "veg",
    title: "سبزیجات",
    note: "برای خوش‌طعم‌تر شدن",
    photo: "tomato",
    href: "/search?cat=veg",
  },
  {
    id: "greens",
    title: "سبزی‌های تازه",
    note: "یک مشت حالِ خوب",
    photo: "herbs",
    href: "/search?cat=greens",
  },
  {
    id: "dried",
    title: "خشکبار و مغزها",
    note: "کوچک و دوست‌داشتنی",
    photo: "walnut",
    href: "/search?cat=dried",
  },
];

function Heading({
  number,
  title,
  note,
  href,
  action = "دیدن همه",
}: {
  number: string;
  title: string;
  note: string;
  href: string;
  action?: string;
}) {
  return (
    <div className={styles.heading}>
      <div>
        <span className={styles.index}>
          {number} / {note}
        </span>
        <h2>{title}</h2>
      </div>
      <Link href={href}>
        {action}
        <ArrowUpLeft size={19} />
      </Link>
    </div>
  );
}

function ProductSection({
  title,
  note,
  hits,
  number,
  href,
}: {
  title: string;
  note: string;
  hits: SearchHit[];
  number: string;
  href: string;
}) {
  if (!hits.length) return null;
  return (
    <section className={styles.productSection}>
      <Heading title={title} note={note} number={number} href={href} />
      <ListingRail hits={hits.slice(0, 8)} />
    </section>
  );
}

export default function HomePage() {
  const { dest } = useStore();
  const all = search({ dest, sort: "newest" }).hits;
  const seasonal = all.filter((hit) => inSeason(hit.type, currentMonth()));
  const fresh = all.filter((hit) => isNobar(hit.listing));
  const picks = [...fresh, ...all.filter((hit) => !isNobar(hit.listing))];
  const shops = [...SHOPS]
    .filter((s) => s.status === "ACTIVE")
    .sort((a, b) => ratingBayes(b) - ratingBayes(a))
    .slice(0, 3);

  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="fresh-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <span /> از خاک خوب، به حال خوب
          </span>
          <h1 id="fresh-title">
            خوب بخور.
            <br />
            <span>تازه زندگی کن.</span>
            <Leaf aria-hidden className={styles.titleLeaf} />
          </h1>
          <p>
            طعمِ واقعی، راه دوری نیست.
            <br />
            میوه و سبزی دلخواهت را با شناخت باغدار،
            <br className={styles.desktopBreak} /> از گوشه‌وکنار ایران انتخاب
            کن.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/search">
              کشف بازار نوبر <ArrowUpLeft size={23} />
            </Link>
            <Link className={styles.storyLink} href="/about">
              از کجا شروع شد؟ <ArrowLeft size={17} />
            </Link>
          </div>
          <div className={styles.destination}>
            <MapPin size={17} />
            <span>
              تازه‌ها برای <strong>{cityName(dest)}</strong>
            </span>
            <span className={styles.destinationDot} /> انتخابِ مقصد، انتخابِ
            تازگی
          </div>
        </div>
        <div className={styles.heroArt}>
          <div className={styles.artLabel}>
            <span>نوبر، به وقت طبیعت</span>
            <span aria-hidden>✳</span>
          </div>
          <Link
            href="/p/tangerine"
            className={styles.fruitWindow}
            aria-label="کشف نارنگی‌های نوبر"
          >
            <Photo
              kind="tangerine"
              alt="نارنگی رسیده و قاچ‌های تازهٔ آن"
              priority
              sizes="(max-width: 700px) 90vw, 550px"
              className={styles.heroFruit}
            />
            <span className={styles.fruitCaption}>
              <span>
                <small>ساده. طبیعی. خوش‌طعم.</small>
                <strong>یک قاچ حالِ خوب</strong>
              </span>
              <ArrowUpLeft size={27} />
            </span>
          </Link>
          <span className={styles.freshSeal}>
            <Sprout size={26} strokeWidth={1.5} />
            از باغ
            <br />
            <strong>تا سفره</strong>
          </span>
          <Link href="/p/pomegranate" className={styles.littleFruit}>
            <Photo
              kind="pomegranate"
              alt=""
              sizes="120px"
              className={styles.littlePhoto}
            />
            <span>
              انارهای نوبر <ArrowUpLeft size={15} />
            </span>
          </Link>
          <span className={styles.artFootnote}>
            زیباییِ زندگی، در ساده‌ترین طعم‌هاست.
          </span>
        </div>
      </section>

      <div className={styles.manifesto}>
        <span className={styles.manifestoTitle}>تازگی، با خیال روشن.</span>
        <span>
          <Check size={16} /> تاریخ برداشت مشخص
        </span>
        <span>
          <Check size={16} /> شناخت باغدار و مبدأ
        </span>
        <span>
          <Check size={16} /> هزینهٔ ارسال پیش از خرید
        </span>
        <Link href="/faq">
          تازگی در نوبر <ArrowUpLeft size={17} />
        </Link>
      </div>

      <section className={styles.collections} aria-label="دسته‌های بازار">
        <div className={styles.collectionHeading}>
          <span className={styles.index}>هر روز، یک انتخاب تازه</span>
          <h2>سلیقه‌ات کدام طعم است؟</h2>
          <Link href="/categories">
            همهٔ دسته‌ها <ArrowLeft size={15} />
          </Link>
        </div>
        <div className={styles.collectionGrid}>
          {COLLECTIONS.map((c) => (
            <Link key={c.id} href={c.href} className={styles.collection}>
              <span className={styles.collectionImage}>
                <Photo
                  kind={c.photo}
                  alt=""
                  sizes="150px"
                  className={styles.collectionPhoto}
                />
              </span>
              <span className={styles.collectionCopy}>
                <small>{c.note}</small>
                <strong>{c.title}</strong>
              </span>
              <ArrowUpLeft size={20} />
            </Link>
          ))}
        </div>
      </section>

      <ProductSection
        number="۰۱"
        title="همین حالا در بازار"
        note="تازه‌رسیده‌ها برای تو"
        href="/search?sort=newest"
        hits={picks}
      />

      <section className={styles.originStory}>
        <div className={styles.originImage}>
          <Image
            src={bannerSrc("banner-harvest")}
            alt="برداشت سیب در باغ؛ دست‌های پشت هر محصول"
            fill
            sizes="(max-width: 700px) 100vw, 60vw"
          />
          <span>هر طعم، از یک آدم شروع می‌شود.</span>
        </div>
        <div className={styles.originCopy}>
          <span className={styles.index}>پشت هر میوه، یک قصه</span>
          <h2>
            آدم‌ها را بشناس.
            <br />
            با خیالِ خوب
            <br />
            <em>انتخاب کن.</em>
          </h2>
          <p>
            نوبر، نزدیک‌تر شدن به آدم‌هایی‌ست که محصولت را پرورش می‌دهند.
            غرفه‌شان را ببین، مبدأ را بشناس و انتخاب خودت را پیدا کن.
          </p>
          <Link href="/shops">
            از اینجا غرفه‌گردی کن <ArrowUpLeft size={22} />
          </Link>
        </div>
      </section>

      <ProductSection
        number="۰۲"
        title="طعمِ این روزهای سال"
        note="با ریتم طبیعت"
        href="/season"
        hits={seasonal}
      />

      <section className={styles.shops}>
        <Heading
          number="۰۳"
          title="از آدم‌های کاربلد"
          note="یک آشنایی خوش‌طعم"
          href="/shops"
          action="همهٔ غرفه‌دارها"
        />
        <div className={styles.shopGrid}>
          {shops.map((shop, i) => (
            <Link
              key={shop.id}
              href={"/shop/" + shop.id}
              className={styles.shop}
            >
              <span className={styles.shopNumber}>۰{i + 1}</span>
              <Photo
                kind={shop.art}
                alt=""
                sizes="76px"
                className={styles.shopPhoto}
              />
              <span className={styles.shopInfo}>
                <strong>{shop.name}</strong>
                <small>
                  <MapPin size={13} />
                  {cityName(shop.cityId)}
                  <span>·</span>
                  <Star size={12} />
                  {shop.ratingAvg.toLocaleString("fa-IR")}
                </small>
              </span>
              <ArrowUpLeft size={20} />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.explore}>
        <Link href="/season" className={styles.seasonCard}>
          <span className={styles.index}>طبیعت، بهترین راهنماست</span>
          <h2>
            هر فصل،
            <br />
            یک دلیل تازه
            <br />
            برای خوش‌مزگی.
          </h2>
          <span className={styles.exploreAction}>
            تقویم طعم‌ها <ArrowUpLeft size={24} />
          </span>
          <Leaf className={styles.seasonLeaf} strokeWidth={0.8} aria-hidden />
        </Link>
        <div className={styles.assistantCard}>
          <span className={styles.assistantMark}>
            <Sprout size={38} strokeWidth={1.4} />
          </span>
          <span className={styles.index}>یک همراه برای انتخاب</span>
          <h2>سلام، من باغبونم.</h2>
          <p>
            بین چند طعم موندی؟
            <br />
            بیا از سلیقه‌ات شروع کنیم.
          </p>
          <Link href="/baghboon">
            گپ زدن با باغبون <MoveUpLeft size={22} />
          </Link>
          <small>نسخهٔ نمایشی با پاسخ‌های از پیش تعریف‌شده</small>
        </div>
      </section>
      <nav className={styles.categoryLinks} aria-label="کشف بیشتر">
        {CATEGORIES.map((c) => (
          <Link href={"/search?cat=" + c.id} key={c.id}>
            {c.name}
            <ArrowUpLeft size={14} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
