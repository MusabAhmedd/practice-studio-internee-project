import "server-only";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function adminServices() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Server Firebase project is not configured");
  const emulator = Boolean(
    process.env.FIREBASE_AUTH_EMULATOR_HOST &&
    process.env.FIRESTORE_EMULATOR_HOST,
  );
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!emulator && (!email || !key))
    throw new Error("Firebase Admin credentials are not configured");
  const app = getApps().length
    ? getApp()
    : initializeApp(
        emulator
          ? { projectId }
          : {
              projectId,
              credential: cert({
                projectId,
                clientEmail: email!,
                privateKey: key!,
              }),
            },
      );
  return { auth: getAuth(app), db: getFirestore(app) };
}
export async function requireUser(request: Request): Promise<string> {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) throw new Error("UNAUTHORIZED");
  try {
    return (await adminServices().auth.verifyIdToken(token)).uid;
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}
