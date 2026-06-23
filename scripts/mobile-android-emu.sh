#!/usr/bin/env bash
# scripts/mobile-android-emu.sh — boot the `garage` AVD in the background.
#
# Usage: npm run mobile:android:emu
#
# By default opens a real macOS window (so you can see + interact with
# the app). Set GARAGEROUTE_EMU_HEADLESS=1 to run windowless — useful on
# CI or when you just want a screencap via `adb exec-out screencap -p`.
#
# Runs the emulator detached so the terminal returns immediately. Polls
# adb for boot completion and prints the result. Idempotent: if the AVD
# is already running, prints its PID and exits 0.
#
set -euo pipefail

# shellcheck source=lib-android-env.sh
source "$(dirname "$0")/lib-android-env.sh"

EMU_AVD="${GARAGEROUTE_AVD:-garage}"
STATE_DIR="$HOME/.garageroute"
EMU_LOG="$STATE_DIR/emulator.log"
EMU_PIDFILE="$STATE_DIR/emulator.pid"

mkdir -p "$STATE_DIR"

# --- preflight ---
if ! command -v emulator >/dev/null 2>&1; then
  echo "ERROR: emulator binary not found in PATH." >&2
  echo "  Install with: brew install --cask android-commandlinetools && sdkmanager --install 'emulator'" >&2
  exit 1
fi

if ! avdmanager list avd 2>/dev/null | grep -q "Name: $EMU_AVD"; then
  echo "ERROR: AVD '$EMU_AVD' not found." >&2
  echo "  Create with: echo no | avdmanager create avd -n $EMU_AVD -k 'system-images;android-36;google_apis;arm64-v8a' -d pixel" >&2
  exit 1
fi

# --- already running? ---
RUNNING_PID=$(pgrep -f "emulator -avd $EMU_AVD" | head -1 || true)
if [ -n "$RUNNING_PID" ]; then
  echo "==> AVD '$EMU_AVD' already running (PID $RUNNING_PID)"
  echo "    Check: adb devices"
  exit 0
fi

# --- launch detached ---
: > "$EMU_LOG"
EMU_WINDOW_FLAGS=()
if [ "${GARAGEROUTE_EMU_HEADLESS:-0}" != "1" ]; then
  echo "    (windowed mode — set GARAGEROUTE_EMU_HEADLESS=1 for headless)"
else
  EMU_WINDOW_FLAGS=(-no-window)
fi

# Always include -no-audio/-no-boot-anim; include -no-window only if headless.
# Note: bash arrays + set -u require "${arr[@]+"${arr[@]}"}" to expand safely
# when the array may be empty.
nohup emulator -avd "$EMU_AVD" -no-audio -no-boot-anim \
  ${EMU_WINDOW_FLAGS[@]+"${EMU_WINDOW_FLAGS[@]}"} \
  >> "$EMU_LOG" 2>&1 &
EMU_BG_PID=$!
echo "$EMU_BG_PID" > "$EMU_PIDFILE"
disown "$EMU_BG_PID" 2>/dev/null || true

echo "==> booting AVD '$EMU_AVD' in background"
echo "    PID:  $EMU_BG_PID (saved to $EMU_PIDFILE)"
echo "    Log:  tail -f $EMU_LOG"

# --- poll for boot completion (up to 90s) ---
echo -n "    Waiting for boot"
for i in $(seq 1 90); do
  if ! kill -0 "$EMU_BG_PID" 2>/dev/null; then
    echo
    echo "ERROR: emulator process died during boot. Last lines of log:" >&2
    tail -20 "$EMU_LOG" >&2
    exit 1
  fi
  if adb devices 2>/dev/null | awk 'NR>1 && $2=="device"' | grep -q .; then
    BOOT_COMPLETED=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r\n ' || true)
    if [ "$BOOT_COMPLETED" = "1" ]; then
      echo " ready (${i}s)"
      adb devices
      echo
      echo "==> AVD up. Next: npm run mobile:android"
      exit 0
    fi
  fi
  # show progress every ~10s
  if [ $((i % 10)) -eq 0 ]; then
    echo -n " ${i}s"
  else
    echo -n "."
  fi
  sleep 1
done

echo
echo "WARNING: emulator didn't report sys.boot_completed=1 within 90s." >&2
echo "  Check: adb devices" >&2
echo "  Log:   tail -f $EMU_LOG" >&2
exit 1
