import { NextResponse } from "next/server";
import { destroyCurrentSession, getCurrentUser, auditUser } from "@/lib/auth-user";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await auditUser("user.logout", user.id, {});
  }
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
}
