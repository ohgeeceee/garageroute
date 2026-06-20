import { NextResponse } from "next/server";
import { BOT_NAME } from "@/lib/bot/config";
import { botEnabled, emailEnabled, messengerEnabled } from "@/lib/bot/config";

export const runtime = "nodejs";

/**
 * Public widget config.
 *
 * The widget fetches this on load to know:
 *  - the bot's name
 *  - whether the bot is online (LLM key set)
 *  - whether email + Messenger features work
 *  - the suggested greeting
 */

export async function GET() {
  return NextResponse.json({
    name: BOT_NAME,
    botOnline: botEnabled(),
    emailOnline: emailEnabled(),
    messengerOnline: messengerEnabled(),
    greeting:
      "Hey! I'm Scout — GarageRoute's helper. I can find sales near you, help you draft a listing, or answer questions about your account. What's up?",
    placeholder: "Ask Scout anything…",
    primaryColor: "#2563eb", // blue-600 to match site
    version: 1,
  });
}