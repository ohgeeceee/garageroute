import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Mobile app points at the live web app. Update `url` to swap environments.
 * Set to undefined to fall back to the bundled `out/` static export.
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
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
