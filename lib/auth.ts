import { cookies } from "next/headers";

export async function isAdmin(request?: Request): Promise<boolean> {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPass) return false;

  if (request) {
    const header = request.headers.get("authorization");
    if (header?.startsWith("Basic ")) {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");
      return user === expectedUser && pass === expectedPass;
    }
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  return session?.value === "1";
}
