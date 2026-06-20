import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.garageroute.app',
  appName: 'GarageRoute',
  webDir: 'out',
  server: process.env.NEXT_PUBLIC_APP_URL
    ? { url: process.env.NEXT_PUBLIC_APP_URL }
    : undefined,
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
