import type { CapacitorConfig } from "@capacitor/cli";

// The app shows the store's static build (apps/web with NEXT_EXPORT=1 and NEXT_PUBLIC_APP=1), copied into the APK.
const config: CapacitorConfig = {
  appId: "ir.nobar.app",
  appName: "نوبر",
  webDir: "../web/out",
  android: {
    // the store sets <meta name="viewport" content="…, viewport-fit=cover"> and pads its bars with the safe-area insets
    backgroundColor: "#ffffff",
  },
  plugins: {
    SystemBars: { insetsHandling: "css", initialViewportFitValueHint: "cover", style: "DEFAULT" },
    SplashScreen: {
      // hidden by the store once the first page has rendered (components/app-shell.tsx)
      launchAutoHide: false,
      launchShowDuration: 3000,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
    },
  },
};

export default config;
