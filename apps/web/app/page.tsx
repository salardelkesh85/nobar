"use client";

import {
  CATEGORIES,
  cityName,
  currentMonth,
  inSeason,
  isNobar,
  LISTINGS,
  PRODUCE_TYPES,
  ratingBayes,
  search,
  SHOPS,
  type SearchHit,
} from "@nobar/demo";
import {
  ArrowLeft,
  Leaf,
  MapPin,
  Scale,
  Sparkles,
  Sprout,
  Star,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ListingRail } from "@/components/listing-card";
import { Photo } from "@/components/photo";
import { bannerSrc } from "@/lib/photos";
import { useStore } from "@/lib/store";
import styles from "./market.module.css";

function Heading({
  title,
  note,
  href,
  light = false,
}: {
  title: string;
  note: string;
  href: string;
  light?: boolean;
}) {
  return (
    <div className={styles.heading} data-light={light || undefined}>
      <div>
        <span>{note}</span>
        <h2>{title}</h2>
      </div>
      <Link href={href}>
        مشاهده همه <ArrowLeft size={16} />
      </Link>
    </div>
  );
}

function Products({
  title,
  note,
  href,
  hits,
}: {
  title: string;
  note: string;
  href: string;
  hits: SearchHit[];
}) {
  if (!hits.length) return null;
  return (
    <section className={styles.products}>
      <Heading title={title} note={note} href={href} />
      <ListingRail hits={hits.slice(0, 10)} />
    </section>
  );
}

export default function HomePage() {
  const { dest } = useStore();
  const all = search({ dest, sort: "newest" }).hits;
  const seasonal = all.filter((hit) => inSeason(hit.type, currentMonth()));
  const fresh = all.filter((hit) => isNobar(hit.listing));
  const featured = [
    ...fresh,
    ...seasonal.filter((hit) => !isNobar(hit.listing)),
  ].slice(0, 8);
  const quick = PRODUCE_TYPES.filter((type) =>
    LISTINGS.some(
      (l) => l.produceTypeId === type.id && l.status === "PUBLISHED",
    ),
  ).slice(0, 8);
  const shops = [...SHOPS]
    .filter((s) => s.status === "ACTIVE")
    .sort((a, b) => ratingBayes(b) - ratingBayes(a))
    .slice(0, 4);

  return (
    <div className={styles.market}>
      <section className={styles.hero} aria-labelledby="market-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <span /> بازار آنلاینِ طعم‌های واقعی
          </span>
          <h1 id="market-title">
            تازه از باغ،
            <br />
            با عشق <em>سرِ سفره.</em>
          </h1>
          <p>
            از باغدارهای شهرهای مختلف خرید کن.
            <br />
            با شناخت مبدأ، تازگی و قیمت تا درِ خانه.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primary} href="/search">
              بریم بازار <ArrowLeft size={19} />
            </Link>
            <Link className={styles.textLink} href="/shops">
              آشنایی با غرفه‌دارها
            </Link>
          </div>
          <div className={styles.destination}>
            <MapPin size={16} />
            <span>
              بازار تازه‌ها برای <strong>{cityName(dest)}</strong>
            </span>
            <span className={styles.destinationLine} />
            <span>از مبدأ تا مقصد، شفاف</span>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <Image
            src={bannerSrc("banner-pomegranate")}
            alt="انارهای رسیده؛ رنگ و طعم تازهٔ فصل"
            fill
            priority
            sizes="(max-width: 700px) 100vw, 55vw"
          />
          <span className={styles.imageShade} />
          <span className={styles.harvestTag}>
            <Leaf size={15} /> فصلِ طعم‌های تازه
          </span>
          <Link href="/p/pomegranate" className={styles.photoCaption}>
            <span>
              <small>از دل باغ‌های ایران</small>
              <strong>دانه‌دانه، طعم زندگی.</strong>
            </span>
            <span className={styles.roundArrow}>
              <ArrowLeft size={21} />
            </span>
          </Link>
          <div className={styles.floatingNote}>
            <Sprout size={23} />
            <span>
              <strong>تازگی را ببین، بعد انتخاب کن.</strong>
              <small>تاریخ برداشت و مبدأ، کنار هر محصول</small>
            </span>
          </div>
        </div>
      </section>

      <div className={styles.benefits}>
        {[
          {
            icon: Sprout,
            title: "تازگی، قابل بررسی",
            text: "تاریخ برداشت هر محصول",
          },
          {
            icon: MapPin,
            title: "مستقیم از مبدأ",
            text: "با شناخت شهر و غرفه‌دار",
          },
          {
            icon: Truck,
            title: "قیمت روشن تا مقصد",
            text: "هزینهٔ ارسال، پیش از خرید",
          },
          {
            icon: Scale,
            title: "انتخاب با مقایسه",
            text: "قیمت، تازگی و زمان رسیدن",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon size={23} strokeWidth={1.5} />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </div>

      <section className={styles.categories} aria-labelledby="categories-title">
        <div className={styles.categoryIntro}>
          <span className={styles.kicker}>بازار به سلیقهٔ تو</span>
          <h2 id="categories-title">امروز چی میل داری؟</h2>
          <Link href="/categories">
            همهٔ دسته‌ها <ArrowLeft size={15} />
          </Link>
        </div>
        <ul>
          {quick.map((type) => (
            <li key={type.id}>
              <Link href={"/p/" + type.id}>
                <span className={styles.categoryPhoto}>
                  <Photo
                    kind={type.id}
                    alt=""
                    sizes="110px"
                    fallback={{ emoji: type.emoji, hue: type.hue }}
                    className={styles.categoryImage}
                  />
                </span>
                <strong>{type.name}</strong>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 && (
        <section className={styles.fresh}>
          <Heading
            title="نوبرش رسیده!"
            note="نوبرهای تازه و انتخاب‌های این فصل"
            href="/search?nobar=1"
            light
          />
          <div className={styles.freshRail}>
            <div className={styles.freshIntro}>
              <Sparkles size={30} strokeWidth={1.4} />
              <h3>
                یک فصل تازه،
                <br />
                یک طعم تازه.
              </h3>
              <p>
                تازه‌رسیده‌های بازار
                <br />
                برای مقصد تو
              </p>
              <Link href="/search?nobar=1" aria-label="دیدن همهٔ نوبرهای تازه">
                <ArrowLeft size={23} />
              </Link>
            </div>
            <ListingRail hits={featured} />
          </div>
        </section>
      )}

      <Products
        title="فصلش رسیده، وقتشه!"
        note={"انتخاب‌های فصل برای " + cityName(dest)}
        href="/search"
        hits={seasonal}
      />

      <section className={styles.discover} aria-label="کشف بازار نوبر">
        <Link href="/origin/miandoab" className={styles.orchard}>
          <Image
            src={bannerSrc("banner-orchard")}
            alt="باغ‌های سرسبز؛ مبدأ محصولات نوبر"
            fill
            sizes="(max-width: 700px) 100vw, 60vw"
          />
          <span className={styles.orchardShade} />
          <span className={styles.storyCopy}>
            <small>هر محصول، یک قصه دارد</small>
            <h2>
              از باغ‌های میاندوآب،
              <br />
              برای سفرهٔ تو.
            </h2>
            <span>
              محصولات این مبدأ <ArrowLeft size={17} />
            </span>
          </span>
        </Link>
        <Link href="/baghboon" className={styles.assistant}>
          <span className={styles.assistantIcon}>
            <Sprout size={36} strokeWidth={1.4} />
          </span>
          <span className={styles.kicker}>همراهت در انتخاب</span>
          <h2>چی بخریم، باغبون؟</h2>
          <p>
            برای مقایسهٔ محصول‌ها و پیدا کردن طعم دلخواهت، از باغبون کمک بگیر.
          </p>
          <span className={styles.assistantLink}>
            بریم گپ بزنیم <ArrowLeft size={17} />
          </span>
          <small>نسخهٔ نمایشی با پاسخ‌های از پیش تعریف‌شده</small>
        </Link>
      </section>

      <Products
        title="تازه برای هر روز"
        note="از سالاد امروز تا غذای فردا"
        href="/search?cat=veg"
        hits={all.filter((hit) =>
          ["veg", "greens"].includes(hit.type.categoryId),
        )}
      />

      <section className={styles.shops}>
        <Heading
          title="آدم‌های پشت طعم خوب"
          note="غرفه‌دارهای نوبر را بشناس"
          href="/shops"
        />
        <div className={styles.shopGrid}>
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={"/shop/" + shop.id}
              className={styles.shop}
            >
              <Photo
                kind={shop.art}
                alt=""
                sizes="72px"
                className={styles.shopPhoto}
              />
              <div>
                <h3>{shop.name}</h3>
                <span>
                  <MapPin size={12} />
                  {cityName(shop.cityId)}
                </span>
                <small>
                  <Star size={12} fill="currentColor" />
                  {shop.ratingAvg.toLocaleString("fa-IR")}{" "}
                  <i>از {shop.ratingCount.toLocaleString("fa-IR")} نظر</i>
                </small>
              </div>
              <ArrowLeft className={styles.shopArrow} size={17} />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.season}>
        <span className={styles.seasonMark}>
          <Leaf size={32} strokeWidth={1.3} />
        </span>
        <div>
          <span className={styles.kicker}>هر چیزی در فصل خودش خوشمزه‌تره</span>
          <h2>با ریتم طبیعت خرید کن.</h2>
          <p>تقویم فصل‌ها، راهنمای تو برای کشف طعم بعدی.</p>
        </div>
        <Link className={styles.primary} href="/season">
          کشف تقویم فصل‌ها <ArrowLeft size={17} />
        </Link>
      </section>
      <nav className={styles.bottomCategories} aria-label="دسته‌های بازار">
        {CATEGORIES.map((cat) => (
          <Link href={"/search?cat=" + cat.id} key={cat.id}>
            {cat.name}
            <ArrowLeft size={14} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
