#!/usr/bin/env bash
# scripts/mobile-android.sh — build, install, launch GarageRoute on Android.
#
# Usage: npm run mobile:android    (or:  ./scripts/mobile-android.sh)
#
# Auto-detects JAVA_HOME, ANDROID_HOME, ANDROID_AVD_HOME from Homebrew /
# Android Studio defaults if not already set in the calling shell.
#
set -euo pipefail

# shellcheck source=lib-android-env.sh
source "$(dirname "$0")/lib-android-env.sh"

# --- resolve project root regardless of caller cwd ---
cd "$(dirname "$0")/.."

echo "==> JAVA_HOME  = $JAVA_HOME"
echo "==> ANDROID_HOME = $ANDROID_HOME"

# --- build chain ---
echo "==> cap sync"
npm run mobile:sync

echo "==> gradle assembleDebug"
( cd android && ./gradlew assembleDebug )

echo "==> adb install"
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

echo "==> adb shell am start"
adb shell am start -n com.garageroute.app/.MainActivity

echo "==> done. App should be on the connected device/emulator."
