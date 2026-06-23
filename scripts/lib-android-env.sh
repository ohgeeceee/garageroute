#!/usr/bin/env bash
# scripts/lib-android-env.sh — auto-detect Android dev env.
#
# Sourced (not executed) by mobile-android*.sh. Sets JAVA_HOME, ANDROID_HOME,
# ANDROID_SDK_ROOT, ANDROID_AVD_HOME and prepends the SDK tool dirs to PATH
# if they aren't already set in the calling shell. Existing values win, so
# CI / custom installs don't get clobbered.
#
# Exits 1 with a helpful message if Java or the SDK can't be located.
#
set -euo pipefail

# --- JAVA_HOME ---
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME}/bin/java" ]; then
  for candidate in \
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
    "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"; do
    if [ -x "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

# --- ANDROID_HOME ---
if [ -z "${ANDROID_HOME:-}" ] || [ ! -x "${ANDROID_HOME}/platform-tools/adb" ]; then
  for candidate in \
    "/opt/homebrew/share/android-commandlinetools" \
    "/usr/local/share/android-commandlinetools" \
    "$HOME/Library/Android/sdk"; do
    if [ -x "$candidate/platform-tools/adb" ]; then
      export ANDROID_HOME="$candidate"
      break
    fi
  done
fi

# --- ANDROID_AVD_HOME (default = ~/.android/avd) ---
if [ -z "${ANDROID_AVD_HOME:-}" ]; then
  if [ -d "$HOME/.android/avd" ]; then
    export ANDROID_AVD_HOME="$HOME/.android/avd"
  fi
fi

export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

# --- sanity check ---
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  echo "ERROR: could not locate a Java runtime." >&2
  echo "  Install with: brew install openjdk@21" >&2
  echo "  Or set JAVA_HOME before running this script." >&2
  return 1 2>/dev/null || exit 1
fi
if [ -z "${ANDROID_HOME:-}" ] || [ ! -x "$ANDROID_HOME/platform-tools/adb" ]; then
  echo "ERROR: could not locate the Android SDK (adb not found)." >&2
  echo "  Install with: brew install --cask android-commandlinetools" >&2
  echo "  Or set ANDROID_HOME before running this script." >&2
  return 1 2>/dev/null || exit 1
fi
