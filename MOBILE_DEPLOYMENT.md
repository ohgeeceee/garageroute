# Mobile deployment — GarageRoute

Self-hosted Capacitor wrapper that ships the Next.js web app as installable iOS + Android apps.

## Architecture

- Web app stays as-is (Next.js 16 + React 19 + Prisma + Stripe + Resend — all server-side)
- Capacitor wraps the live `https://garageroute.com` URL in a native WebView
- Native plugins add: Geolocation (map locator), Haptics (button feedback), StatusBar (native chrome), SplashScreen, Keyboard, App (lifecycle/back button), Preferences (local KV)
- iOS shell: Capacitor 8 + Xcode 26 + SPM plugin packages
- Android shell: Capacitor 8 + compileSdk 36 / minSdk 24

## What was wired in this pass

| Change | File |
|---|---|
| Native plugin install | `package.json` (7 Capacitor plugins) |
| Bundle ID, app name, web dir, splash/status bar config | `capacitor.config.ts` |
| iOS permissions (location, background, push prep) | `ios/App/App/Info.plist` |
| Android permissions (location, vibrate, post-notifications, boot) | `android/app/src/main/AndroidManifest.xml` |
| Plugin registration | `npx cap sync` ran; SPM packages resolved for iOS, plugins wired for Android |

## Build prerequisites (one-time, on your Mac)

### iOS
1. Open `Xcode.app` → Settings → Components → install **iOS 26.5** simulator platform (~7 GB)
2. Open `Xcode.app` → Settings → Accounts → sign in with your Apple ID so Xcode has a development team
3. Verify: `xcodebuild -version` should report Xcode 26.5

### Android
1. Install **Android Studio** (`brew install --cask android-studio` or download from developer.android.com)
2. First launch → SDK Manager → install:
   - Android SDK Platform 36 (already required by `compileSdk`)
   - Android SDK Build-Tools 36.x
   - Android SDK Command-line Tools (latest)
   - Android SDK Platform-Tools (gives you `adb`)
   - NDK (optional, only if you add custom native code later)
3. Set `ANDROID_HOME` in `~/.zshrc`:
   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
   ```

## Daily build commands

```bash
# 1. Build the web app and sync into both native projects
cd /Users/joncurrie/garageroute
npm run build          # Next.js → out/
npx cap sync           # copies out/ → native assets, refreshes plugin manifests

# 2a. iOS — open in Xcode for debug run on simulator
npx cap open ios
#   In Xcode: select an iPhone simulator → ⌘R to build & run

# 2b. iOS — command line build for simulator (no signing)
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  build

# 3a. Android — open in Android Studio for debug run on emulator/device
npx cap open android
#   In Android Studio: select a device → Run ▶

# 3b. Android — command line build (debug APK)
cd android
./gradlew assembleDebug
#   APK lands at: android/app/build/outputs/apk/debug/app-debug.apk
#   Install via: adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Server-side hosting (option 1)

The mobile app currently loads `https://garageroute.com` via `server.url` in `capacitor.config.ts`. This means:

- The web app must be deployed and reachable at that URL
- App Store reviewers will see a "live wrapper" — Apple's guideline 4.2 may push back; the native plugins (Geolocation, Haptics, StatusBar) help pass review but aren't bulletproof

**To self-host on your VPS (`montanablotter.com`):**

1. Stand up a Node 20+ process running `next start` for the garageroute app on a domain you control (e.g. `app.garageroute.com`)
2. Update `capacitor.config.ts`:
   ```ts
   server: { url: "https://app.garageroute.com", cleartext: false }
   ```
3. Run `npx cap sync` and rebuild the apps

## Production signing (deferred until you have Apple/Google dev accounts ready)

### iOS — App Store Connect
1. Apple Developer Program ($99/yr) → create an App ID `com.garageroute.app` with Push Notifications capability
2. Create a Distribution provisioning profile in Xcode → Signing & Capabilities
3. In Xcode: set Team, bump Build/Version, Product → Archive → Distribute App → App Store Connect

### Android — Google Play Console
1. Google Play Developer account ($25 one-time)
2. Generate upload keystore: `keytool -genkey -v -keystore garageroute-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias garageroute`
3. Add to `~/.gradle/gradle.properties`:
   ```
   GARAGEROUTE_UPLOAD_STORE_FILE=garageroute-upload.jks
   GARAGEROUTE_UPLOAD_KEY_ALIAS=garageroute
   GARAGEROUTE_UPLOAD_STORE_PASSWORD=...
   GARAGEROUTE_UPLOAD_KEY_PASSWORD=...
   ```
4. Add `signingConfigs.release` block in `android/app/build.gradle`
5. `./gradlew bundleRelease` → upload `.aab` to Play Console

## What's NOT done (deliberate, deferred)

- **App icons** — currently using default Capacitor placeholders. Replace with branded GarageRoute icon (1024×1024 source → run `npx @capacitor/assets generate --android --ios`)
- **Splash screen art** — using white background only. Add branded splash when the brand icon is finalized
- **Push notifications** — permission is declared (`UIBackgroundModes: remote-notification`, `POST_NOTIFICATIONS`) but the `@capacitor/push-notifications` plugin is NOT installed yet. Needs APNs key from Apple + Firebase Cloud Messaging setup. Defer until you have sale alerts worth pushing.
- **Deep links / Universal Links** — not configured. Add `apple-app-site-association` and `assetlinks.json` when you want `https://garageroute.com/sales/abc` to open in the app.
- **Offline mode** — current config is live-URL only. No service worker caching strategy beyond the existing `public/sw.js`. If offline support is needed, that's a bigger refactor (move data fetching to a syncable cache).