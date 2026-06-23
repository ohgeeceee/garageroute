import { NextResponse } from "next/server";
import { pointInStateBBox } from "@/lib/state-bounds";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, lat, lng } = body as { slug: string; lat: number; lng: number };

    if (!slug || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const inState = await pointInStateBBox(slug, lat, lng);
    return NextResponse.json({ inState });
  } catch {
    return NextResponse.json(
      { error: "Failed to validate location" },
      { status: 500 }
    );
  }
}
