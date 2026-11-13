# Nobar for Android (buyers)

The buyer app: the store (`apps/web`) built as static pages in **app mode** and packaged with
[Capacitor](https://capacitorjs.com/) as a native Android app (`ir.nobar.app`, Android 7 and newer).

App mode (`NEXT_PUBLIC_APP=1`) changes the store's chrome, not its pages:

- tab pages (home, categories, Baghboon, cart, profile, search) keep the full header; every other page gets an
  app bar with a back arrow and a title instead of the header and breadcrumbs;
- on a product page the Add to cart bar replaces the bottom tabs;
- no site footer; edge to edge, with the bars padded by the system insets;
- the Android back button closes an open sheet, goes back, or leaves the app from the home page;
- the splash screen stays until the first page is drawn; an offline notice appears without a connection.

Data comes from the demo catalog until a public API exists; set `NEXT_PUBLIC_API_URL` for the web build to use the
API instead.

## Build

The APK is built in CI (`.github/workflows/android.yml`): store build → `cap sync` → Gradle, then the app runs on an
Android 14 emulator where `e2e/app.mjs` checks home, a product page, add to cart, reload on an inner page, the back
button, search with the filter sheet, the cart, categories, profile and dark mode, with a screenshot of each step.

Locally (needs JDK 21 and the Android SDK):

```bash
pnpm --filter @nobar/mobile build
```

```bash
cd apps/mobile/android && ./gradlew assembleDebug
```

The APK is in `android/app/build/outputs/apk/debug/`. `node scripts/render-assets.cjs` redraws the launcher icons
and splash images from the leaf mark and the Vazirmatn wordmark (needs Playwright).

## Release signing

The release build is signed only when `NOBAR_KEYSTORE`, `NOBAR_KEYSTORE_PASSWORD`, `NOBAR_KEY_ALIAS` and
`NOBAR_KEY_PASSWORD` are set. In CI they come from the secrets named in the workflow; without them each run signs
with a new key, so a new build cannot update an installed one (uninstall first). Keep the keystore safe: an app in a
store can only be updated with the same key.

## Native code

`StaticRoutesWebViewClient` makes a full page load of an inner route (`/search/`, `/l/…/`) open that route's own
HTML. Capacitor's server answers extension-less paths with the root `index.html`, which suits single-page apps but
not a static export with one page per route.
