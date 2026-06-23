import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mobile app points at the live web app. Update `server.url` to swap environments.
 * Set to undefined to fall back to the bundled `out/` static export.
 *
 * Plugin config:
 *   - StatusBar: dark icons on light background to match the white app chrome.
 *   - SplashScreen: short fade, brand background color, hide once the WebView is ready.
 *   - Geolocation: enable high accuracy by default so the map locator can center on the user.
 */
const config: CapacitorConfig = {
  appId: "com.garageroute.app",
  appName: "GarageRoute",
  webDir: "out",
  server: {
    url: "https://garageroute.com",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#ffffff",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "small",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
