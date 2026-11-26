import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { serverEnv } from "./env";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/** scrypt password hash: "scrypt$N$r$p$salt$hash" (never plaintext). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await new Promise<Buffer>((res, rej) =>
    crypto.scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))),
  );
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await new Promise<Buffer>((res, rej) =>
    crypto.scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))),
  );
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

let cachedSecret: Uint8Array | null = null;
/**
 * Session signing secret. Production requires AUTH_SECRET. In local development a random secret
 * is generated once and kept in data/.secret so sessions survive restarts.
 */
export function sessionSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  let s = serverEnv.authSecret;
  if (!s) {
    if (serverEnv.isProd && process.env.WP_ALLOW_EPHEMERAL_SECRET !== "1") throw new Error("AUTH_SECRET must be set in production (at least 32 random characters).");
    const file = path.join(process.cwd(), "data", ".secret");
    try {
      s = fs.readFileSync(file, "utf8").trim();
    } catch {
      s = randomToken(48);
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, s, { mode: 0o600 });
      } catch {
        /* read-only filesystem: secret lives only for this process */
      }
    }
  }
  if (s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  cachedSecret = new TextEncoder().encode(s);
  return cachedSecret;
}
