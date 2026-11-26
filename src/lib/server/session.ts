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
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
