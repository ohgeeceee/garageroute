# Mobile dev loop — GarageRoute

The 30-second loop for running GarageRoute on iOS and Android while you iterate on web code.

## The loop

```bash
cd ~/garageroute

# web dev server (separate terminal — leave running)
npm run dev

# after a web change, redeploy to the running app:
npm run mobile:android     # or: mobile:ios:run
```

That's it. The `mobile:android` script does `cap sync → gradle assembleDebug → adb install → adb shell am start` in one chain.

## One-time setup (Mac)

Drop these into `~/.zshrc` and `source` it once:

```bash
# Android
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME
export ANDROID_AVD_HOME=$HOME/.android/avd
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH
```

Install once via Homebrew:

```bash
brew install openjdk@21
brew install --cask android-commandlinetools
sdkmanager --install "platforms;android-36" "build-tools;36.0.0" "emulator" "system-images;android-36;google_apis;arm64-v8a"
echo "no" | avdmanager create avd -n garage -k "system-images;android-36;google_apis;arm64-v8a" -d pixel
```

For iOS you already have Xcode 26 from `MOBILE_DEPLOYMENT.md` setup.

## Available scripts

| Script | What it does |
|---|---|
| `npm run mobile:sync` | `cap sync` — copies web build + refreshes plugin manifests in both native projects |
| `npm run mobile:android` | Full Android chain: sync → build → install → launch |
| `npm run mobile:android:emu` | Boots the headless `garage` AVD (run once, leave running) |
| `npm run mobile:android:studio` | Open the Android project in Android Studio |
| `npm run mobile:ios` | Open the iOS project in Xcode |
| `npm run mobile:ios:run` | Full iOS chain via `cap run ios` (sync → build → install → launch) |
| `npm run mobile:ios:run -- --target="iPhone 16"` | Same, pinned to a specific simulator |

## Typical day

```bash
# morning — boot the Android emulator (runs detached, terminal returns immediately)
npm run mobile:android:emu
# ...wait ~30-60s for "ready (Xs)" output...

# edit web code; when you want to see it on Android:
npm run mobile:android

# when done for the day:
kill $(cat ~/.garageroute/emulator.pid)

# switch to iOS sim:
npm run mobile:ios:run
```

The native WebView reloads `https://garageroute.com` from your dev server's public URL — if you want true hot-reload against `localhost`, swap `server.url` in `capacitor.config.ts` to your dev tunnel URL and re-run `npm run mobile:sync`.

## Troubleshooting

The `mobile:android*` scripts auto-detect `JAVA_HOME`, `ANDROID_HOME`, and `ANDROID_AVD_HOME` from Homebrew and `~/.android/avd/` if not already set, so a fresh terminal should "just work" without sourcing `~/.zshrc`.

| Symptom | Fix |
|---|---|
| `adb: no devices/emulators found` | Emulator isn't booted — run `mobile:android:emu` and wait for the home screen, or `adb devices` to check |
| `Unable to locate a Java Runtime` (Android) | `brew install openjdk@21` — the `mobile:android` script auto-detects it, but if you have a non-Homebrew JDK in a custom path, set `JAVA_HOME` before running |
| Gradle build fails with `SDK location not found` | The script couldn't find the SDK. Check `echo $ANDROID_HOME` after `source scripts/lib-android-env.sh` |
| Emulator boots but WebView shows blank page | Pull-to-refresh in the app, or `adb shell am force-stop com.garageroute.app && adb shell am start -n com.garageroute.app/.MainActivity` |
| `cap run ios` errors "no target specified" with multiple sims booted | Pass it explicitly: `npm run mobile:ios:run -- --target="iPhone 16"` |
| `cap run ios` errors `xcrun: error: unable to find utility "simctl"` | `xcode-select` is pointing at the standalone CLT, not full Xcode. Fix with `sudo xcode-select --switch /Applications/Xcode.app` |
| `mobile:android` succeeds but the app shows stale code | `cap sync` was skipped or the web build didn't run. Run `npm run build && npm run mobile:sync` then retry |

## How `mobile:android` works under the hood

The script is `scripts/mobile-android.sh`, which:

1. Sources `scripts/lib-android-env.sh` — auto-detects `JAVA_HOME` (Homebrew `openjdk@21`) and `ANDROID_HOME` (Homebrew `android-commandlinetools` or Android Studio SDK) and prepends their `bin/` dirs to `PATH`.
2. Runs `npm run mobile:sync` to copy the web build into the native projects.
3. Runs `./gradlew assembleDebug` in `android/` (assembles the debug APK).
4. Runs `adb install -r` to push the APK to the connected device/emulator.
5. Runs `adb shell am start` to launch `com.garageroute.app`.

Both `mobile:android` and `mobile:android:emu` source the same env lib so env handling stays in one place.

## See also

- `MOBILE_DEPLOYMENT.md` — production signing, App Store / Play Store submission, server-side hosting
