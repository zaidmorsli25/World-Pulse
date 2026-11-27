import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { sessionSecret } from "./crypto";
import { serverEnv } from "./env";

const COOKIE = "wp_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(sessionSecret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: serverEnv.isProd, path: "/", maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: serverEnv.isProd, path: "/", maxAge: 0 });
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    // A pending-signup marker is signed with the same key but is never a login.
    return typeof payload.sub === "string" && payload.p === undefined ? payload.sub : null;
  } catch {
    return null;
  }
}

// A short-lived marker that this browser just created an account that is waiting for email
// confirmation. It lets the original tab log in by itself once the link in the email is clicked.
const PENDING = "wp_pending";
const PENDING_AGE = 60 * 60; // 1 hour

export async function setPendingSignup(userId: string) {
  const token = await new SignJWT({ p: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${PENDING_AGE}s`)
    .sign(sessionSecret());
  (await cookies()).set(PENDING, token, { httpOnly: true, sameSite: "lax", secure: serverEnv.isProd, path: "/", maxAge: PENDING_AGE });
}

export async function getPendingSignup(): Promise<string | null> {
  const token = (await cookies()).get(PENDING)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    return payload.p === 1 && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function clearPendingSignup() {
  (await cookies()).set(PENDING, "", { httpOnly: true, sameSite: "lax", secure: serverEnv.isProd, path: "/", maxAge: 0 });
}
