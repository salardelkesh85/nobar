# Nobar — Orchard Studio

The current frontend direction is a contemporary Persian marketplace: warm neutral space, generous product imagery, considered typography, and restrained colour. Forest green is the main action colour, pomegranate identifies new-season discovery, and saffron supports seasonal editorial content. Colourful market sections remain on the home page; product and checkout pages are quieter.

## References actually inspected

- [Vercel Commerce discovery composition](https://github.com/vercel/commerce/blob/main/components/grid/three-items.tsx): image-led browsing and clear content hierarchy.
- [Vercel Commerce product description](https://github.com/vercel/commerce/blob/main/components/product/product-description.tsx): separation of product information, variant selection and purchase action.
- [Radix Colors](https://github.com/radix-ui/colors): semantic colour roles and separate light/dark palettes. Nobar keeps its own colours rather than importing another brand's palette.

Direct access to Aesop, Linear, Apple, Digikala and Snapp Market was blocked by this environment's network policy. Their live sites were not reviewed. No external layouts, assets or source code were copied into the application.

## Foundations

- Shared colours, radii, typography and component styles: `packages/ui/src/theme.css`.
- Shared buttons, cards, inputs, empty states, stats and section headings: `packages/ui/src/primitives.tsx`.
- Existing self-hosted Vazirmatn Nobar font. Display weights 700–800; normal content 400–600. No external font requests.
- Warm canvas, white surfaces, quiet borders; shadows reserved for overlays. Card radius 20px, control radius 12px. Main action height 44–52px.
- Logical direction and RTL throughout. Numeric money stays integer Rial in data; display stays Persian Toman. No fabricated discounts, stock counters, timers or delivery promises.
- Explicit/system dark mode and reduced motion remain supported. Existing simple mode remains available.

## Page families

| Family | Composition |
| --- | --- |
| Home | Saffron image hero, produce categories, pomegranate featured rail, destination-aware seasonal selections, origin story, seller discovery |
| Search | Quiet filter sidebar, sorting strip, separate product cards; native filter dialog on mobile |
| Product | Large gallery, readable details/specifications, separate purchase panel, related products, story/reviews and Q&A |
| Produce | Soft branded introduction, product image and season badges, comparable offers |
| Shops | Editorial introduction and image-led seller cards with location, rating and story |
| Shop/origin | Large origin imagery, identity and facts, products and producer story |
| Categories | Category jump links, numbered sections, produce tiles, origin discovery |
| Season/compare | Readable data with bounded horizontal table regions where needed; comparison cards and priorities |
| Cart/checkout | Slim step indicator, per-shop groups, clear summary and address form |
| Account/orders | Persistent personal navigation, consistent cards, signed-out and empty states |
| Login | Focused form card, clear phone/code/name steps, demo-auth disclosure |
| Baghboon | Calm chat surface, clear input and proposal actions; scripted demo remains labelled |
| Help/policies | Quiet side navigation and readable article layout |
| Seller/staff | Shared workspace topbar/sidebar, soft active navigation, consistent metrics, forms and scrollable tables |

Buyer composition lives in `apps/web/app/studio.css`, with route context in `components/page-frame.tsx` and reusable editorial introductions in `components/page-intro.tsx`. The home keeps its scoped `market.module.css`. Operational shells share the `studio-workspace` styles from the UI package.

## Interaction details

Search suggestions support Arrow Up/Down, Enter and Escape. The active suggestion is exposed with `aria-activedescendant`. Filter reset clears all filter parameters in one navigation while retaining unrelated query parameters. Mobile filters and product galleries use native dialogs for focus containment, Escape and focus restoration. Horizontal season/staff table regions have names and keyboard focus targets. Produce without a photo retains a gallery fallback.

The storefront still uses demo data/localStorage. No API integration, production authentication, payment or live notification service was added by this redesign.

## Validation and publishing

Validate all three frontends with `pnpm typecheck:frontends`, the shared rules with `pnpm lint:rtl`, and the existing suites with `pnpm test`. Build all three with `NEXT_EXPORT=1` and their GitHub Pages base paths before publishing.

The 64 existing tests, full type check, RTL lint and all three static exports passed. The assembled `/nobar/` artifact was served locally: 11 representative routes, image navigation, cart hydration, panel-to-store links and requested assets passed.

Browser checks cover 46 routes: every static buyer, seller and staff route plus representative product, produce, shop and origin routes at 390px and 1440px. Additional focused checks cover narrow mobile/tablet layouts, cart/address persistence, favourites, filter reset and dismissal, gallery dismissal, keyboard suggestions, city selection and dark/reduced-motion rendering. These are local browser checks, not production service validation.

The user requested publishing frontend changes after validation. Push the reviewed change to `main` and verify the existing **Deploy demo to GitHub Pages** workflow completes successfully. Buyer: `/nobar/`; seller: `/nobar/seller/`; staff: `/nobar/admin/`. Do not describe a push as a completed deployment until the Pages job succeeds.
