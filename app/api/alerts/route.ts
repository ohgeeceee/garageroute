import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, zip, category, radius } = body;

  if (!email || !zip) {
    return NextResponse.json(
      { error: "Email and ZIP code are required" },
      { status: 400 }
    );
  }

  const alert = await prisma.alert.create({
    data: {
      email: String(email).trim().toLowerCase(),
      zip: String(zip).trim(),
      category: String(category || ""),
      radius: Number(radius || 25),
    },
  });

  return NextResponse.json(alert, { status: 201 });
}
