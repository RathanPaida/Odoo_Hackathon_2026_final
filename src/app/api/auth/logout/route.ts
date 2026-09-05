// src/app/api/auth/logout/route.ts
export const runtime = "nodejs";
import { cookies } from "next/headers";
import { destroySession, REFRESH_COOKIE } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

export async function POST() {
  const user = await getCurrentUser();
  const store = await cookies();
  const rawRefresh = store.get(REFRESH_COOKIE)?.value;

  await destroySession(rawRefresh);

  if (user) {
    await writeAudit({
      entityType: "User",
      entityId: user.id,
      action: "LOGOUT",
      actorId: user.id,
    }).catch(() => {});
  }

  return Response.json({ ok: true, message: "Logged out." });
}
