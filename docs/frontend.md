# Nobar — Frontend demo (3 apps)

> Status: **demo on sample data**. For the current cross-application visual language and validation workflow, see [Orchard Studio](design-system.md). The NestJS API exists, but these frontends are not yet connected to it.

## What exists

| App | Path | Port | Run |
|---|---|---|---|
| Buyer storefront (PWA) | `apps/web` | 3000 | `pnpm dev:web` |
| Seller panel (غرفه‌دار) — signed in as shop `s1` «باغ سیب حاج رحیم» | `apps/seller` | 3001 | `pnpm dev:seller` |
| Staff back office | `apps/admin` | 3002 | `pnpm dev:admin` |

On the 8 GB machine run **one app at a time**.

Shared packages:

- `packages/ui` — design tokens (`theme.css`: light/dark/simple mode), self-hosted Vazirmatn Nobar font, primitives (Button, Card, Badge, Field…) and Persian display components (`<Toman>`, `<Weight>`, `<JalaliDate>`, `<RelativeDay>`, `FreshnessBadge`, `FreshnessMeter`, `NobarBadge`, `ProduceArt`).
- `packages/demo` — sample data (12 shops, 33 listings, 30 produce types with seasons) and the deterministic rules from the kit's domain model: freshness meter (§5.1), price per kg and market stats (§7), delivery eligibility and ETA (§10), landed price and the comparison engine with presets and badges (§8.2), Persian search, per-shop cart quotes (§9).
- `packages/fa` — gained `formatWeight`, `tehranDaysBetween`, `relativeDayFa`.

## Design system v2 (2026-10-30)

- Semantic tokens in the shadcn style (each colour with its pair, one radius scale) in `packages/ui/src/theme.css`: warm mint background, leaf/forest greens, pomegranate for «نوبر شد!», saffron accents; soft/lift/float elevation; light, dark (explicit or system) and simple mode.
- Self-hosted vector produce illustrations (`packages/ui/src/illustrations.tsx`, 30 kinds) replace emoji until real seller photos exist; gradients are rendered once per page by `<ProduceDefs/>`.
- Storefront: announcement strip, frosted sticky header with category bar, bento home hero, cards with quick-add and landed-price chip, floating mobile bottom bar with a raised Baghboon button. Panels share the same tokens and shells.

## Storefront v3 — photo-based, Digikala/Snapp Market style (2026-10-30)

Owner feedback: illustrations looked cartoonish, the dark-green look was heavy and the pages did not feel like a real store. Changes:

- Neutral white/light-grey surfaces; green only for brand actions; pomegranate red only for the «نوبر شد!» rail. Smaller radii (12px cards, 8px controls), hairline borders, light shadows.
- Real photos for 22 produce types and 4 banners from Wikimedia Commons (free licences), resized to WebP (~2 MB total) in `apps/web/public/photos/`, served by `next/image`, credits at `/about/credits` (`apps/web/lib/photo-credits.json`). They are placeholders until sellers upload their own photos (kit rule: no stock photos in production); listing pages say so.
- Header with wide search, sign-in and cart; category menu row; flat mobile bottom bar.
- Home: photo banner carousel + side banners, produce photo circles, red «نوبر شد!» deals-style rail, promo banners, per-category rails, top shops.
- Product card: photo, two-line title, freshness dot, rating, shop/city, price per kg, landed price; quick «+» add.
- Search: filter sidebar, sort tabs, hairline grid. Listing page: gallery · specs · sticky buy box, similar products, reviews, farm story.
- Illustrations (`ProduceArt`) remain only as fallback for produce without a photo (season calendar).
- Follow-up pass: shop page with cover photo and avatar, origin pages with photo headers, compare/cart/checkout restyled (checkout step bar), categories page with photo tiles, seller panel uses the same photos (`apps/seller/public/photos`), solid `bg-nobar-solid` / `bg-brand-solid` tokens for white-text surfaces in dark mode, and `cn()` now uses `tailwind-merge` (configured with the Nobar tokens) so passed classes override component defaults.

## Storefront pages

Home (نوبر شد!, نوبرهای این هفته, فصلشه, categories, origins) · `/search` with filters and sorts · `/p/[slug]` all offers of a produce type · `/l/[slug]` listing (freshness meter, harvest date, delivery checker for the destination city, landed price, market price, farm-story card, reviews, JSON-LD) · `/compare` · `/shop/[slug]` باغ‌نامه · `/origin/[city]` · `/season` تقویم نوبر with «نوبر شد» subscriptions · `/cart` grouped by shop · `/checkout` (address, shipping per shop, simulated payment, escrow explanation) · `/orders` tracking with a demo simulator · `/me` (simple mode, theme, destination) · `/baghboon` scripted assistant.

## Rules kept even in the demo

- Destination city (cookie) drives everything: products that would not arrive fresh are hidden and listed separately with the reason.
- Baghboon is **scripted, not an LLM**, and labelled as such; its numbers come only from the demo rules; cart changes are proposals the user confirms.
- RTL: only logical Tailwind classes — `pnpm lint:rtl` fails on `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right`.
- No foreign CDNs or fonts at runtime.

## Known gaps / deviations (to resolve before real data)

- Money is integer Rial as `number` (safe integers). The kit specifies `bigint` + `Money` and decimal strings on the wire — switch when the API client exists.
- Cart, orders, seller and staff decisions live in `localStorage`; no auth, no API. Data access should move to the generated client in `packages/contracts`.
- Images are placeholder artwork (`ProduceArt`); real seller photos and the image loader come with the media module.
- Shipping lanes are approximated from distance between cities; real lanes are staff-edited data.
- Voice input, real payment gateway, Web Push and offline shell are not implemented.
- No unit tests yet for `packages/demo` rules and no Playwright/axe checks.

## Open decision

The «nobar-claude-kit» (modular monolith, `apps/web|seller|admin`, `packages/ui|persian`) and the existing `docs/architecture.md` + ADRs (microservices) disagree. The frontend follows the kit and the nationwide marketplace model chosen by the owner on 2026-10-30; `CLAUDE.md` still says "same city" and needs updating once the architecture choice is confirmed.

## Public demo on GitHub Pages

`.github/workflows/pages.yml` builds all three apps as a static export on every push to `main` (and nightly, so demo dates stay fresh) and publishes them to `https://<user>.github.io/nobar/` (store), `/nobar/seller/` and `/nobar/admin/`.

- Static export is enabled with `NEXT_EXPORT=1`; `NEXT_PUBLIC_BASE_PATH` sets the sub-path. Normal `pnpm dev:*` is unaffected.
- Because there is no server, the destination city is read from its cookie in the browser (`StoreProvider`), and pages that depend on it render through a client `view.tsx` next to a static `page.tsx` that only does `generateStaticParams` and metadata.
- Routes use ASCII ids (`/l/l501`, `/p/pomegranate`, `/shop/s5`); the order page is `/order?code=…`.
- `tools/static-export/flatten-segments.mjs` copies Next's nested prefetch files to the dotted names the client requests (static hosts cannot rewrite).
- One-time setup: the repository must be public (free plan) and **Settings → Pages → Source = GitHub Actions**.
- Local check: build with the env vars above, copy `apps/web/out` to `<dir>/nobar`, run the flatten script, serve `<dir>` with any static server. In Git Bash set `MSYS_NO_PATHCONV=1` or the base path gets rewritten to a Windows path.

## First home-page iteration — energetic market

The buyer home page now uses a saffron hero, leaf-green calls to action and a pomegranate-coloured featured rail. Its layout and styles live in `apps/web/app/page.tsx` and the scoped `market.module.css`; other routes retain their existing layouts.

The page prioritises product discovery: quick produce categories, destination-aware new-season and seasonal selections, everyday vegetables, seller discovery, and the seasonal calendar. Featured selections combine new-season items with other in-season products when available. Existing product cards retain quick-add and favourites. No discount percentages, countdowns or delivery guarantees are fabricated. Baghboon remains explicitly labelled as a scripted demo.

Responsive layouts were checked in Chromium at 360, 390, 768 and 1440 pixels, including cart persistence, favourites and navigation to search. Product imagery uses the existing credited demo assets. This iteration covers the buyer home page; search, product details, checkout and the seller/admin panels have not been redesigned.
