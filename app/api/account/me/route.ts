import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      city: user.city,
      state: user.state,
      zip: user.zip,
      status: user.status,
      verifiedSeller: user.verifiedSeller,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}
