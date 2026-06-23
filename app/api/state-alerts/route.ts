import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reuses the Alert model for state-launch notifications.
// category is set to "state-launch:<slug>" to distinguish from
// regular zip/category alerts.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, stateSlug } = body;

  if (!email || !stateSlug) {
    return NextResponse.json(
      { error: "email and stateSlug are required" },
      { status: 400 }
    );
  }

  const emailStr = String(email).trim().toLowerCase();
  if (!emailStr.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  await prisma.alert.create({
    data: {
      email: emailStr,
      zip: "",
      category: `state-launch:${String(stateSlug).toLowerCase()}`,
      radius: 0,
    },
  });

  return NextResponse.json({ ok: true });
}
