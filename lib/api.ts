import "server-only";
import { adminServices } from "./firebase-admin";
import { NextResponse } from "next/server";
export async function limited(uid: string) {
  const { db } = adminServices();
  const ref = db.collection("rateLimits").doc(uid);
  const now = Date.now();
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();
    const start =
      typeof data?.start === "number" && now - data.start < 60000
        ? data.start
        : now;
    const count = start === now ? 0 : Number(data?.count ?? 0);
    if (count >= 15) return false;
    tx.set(ref, { start, count: count + 1 });
    return true;
  });
}
export function apiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED")
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  console.error(
    "API request failed",
    error instanceof Error ? error.name : "unknown",
  );
  return NextResponse.json(
    { error: "Unable to complete the request. Please try again." },
    { status: 500 },
  );
}
