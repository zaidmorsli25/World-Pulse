import "server-only";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { USERNAME_RE } from "@/lib/game/engine";
import { hashPassword, randomToken, sha256, verifyPassword } from "./crypto";
import { serverEnv, supabaseConfigured } from "./env";
import { HttpError } from "./http";
import { withPlayer } from "./players";
import { getStore } from "./store";

export const PASSWORD_MIN = 8;

export function validatePassword(pw: string) {
  if (pw.length < PASSWORD_MIN) throw new HttpError(400, `Password must be at least ${PASSWORD_MIN} characters.`, "weak_password");
  if (pw.length > 200) throw new HttpError(400, "Password is too long.", "weak_password");
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) throw new HttpError(400, "Use at least one letter and one number.", "weak_password");
}

const anonClient = () => createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

/** Returns the new user id, or null when the account needs email confirmation first. */
export async function signUp(email: string, username: string, password: string): Promise<{ userId: string | null; needsConfirmation: boolean }> {
  email = email.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) throw new HttpError(400, "Usernames are 3–20 letters, numbers, dots, dashes or underscores.", "bad_username");
  validatePassword(password);
  const store = getStore();
  if (await store.findUserByUsername(username)) throw new HttpError(409, "That username is taken.", "username_taken");

  if (supabaseConfigured()) {
    const { data, error } = await anonClient().auth.signUp({ email, password, options: { data: { username } } });
    if (error || !data.user) throw new HttpError(400, error?.message ?? "Could not create the account.", "signup_failed");
    // Supabase returns an obfuscated user (no identities) when the email already exists.
    if (data.user.identities && data.user.identities.length === 0) throw new HttpError(409, "An account with this email already exists.", "email_taken");
    const userId = data.user.id;
    // Create the profile immediately so the username is reserved.
    await getStore().savePlayer(
      (await import("@/lib/game/engine")).newPlayer(userId, username, new Date()).state,
      -1,
      [],
    );
    return { userId: data.session ? userId : null, needsConfirmation: !data.session };
  }

  if (await store.findUserByEmail(email)) throw new HttpError(409, "An account with this email already exists.", "email_taken");
  const userId = crypto.randomUUID();
  await store.createUser({ id: userId, email, username, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() });
  await withPlayer(userId);
  return { userId, needsConfirmation: false };
}

export async function signIn(identifier: string, password: string): Promise<string> {
  const store = getStore();
  const fail = () => new HttpError(401, "Email/username or password is incorrect.", "bad_credentials");
  let email = identifier.trim().toLowerCase();
  if (!email.includes("@")) {
    const u = await store.findUserByUsername(identifier.trim());
    if (!u) {
      await hashPassword(password); // equalize timing
      throw fail();
    }
    email = u.email;
  }
  if (supabaseConfigured()) {
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes("confirm")) throw new HttpError(403, "Please confirm your email address first.", "unconfirmed");
      throw fail();
    }
    return data.user.id;
  }
  const user = await store.findUserByEmail(email);
  const ok = await verifyPassword(password, user?.passwordHash ?? "scrypt$16384$8$1$AAAA$AAAA");
  if (!user || !ok) throw fail();
  return user.id;
}

/** Always resolves with the same public message so attackers cannot discover registered emails. */
export async function requestPasswordReset(email: string, origin: string): Promise<{ devLink?: string }> {
  email = email.trim().toLowerCase();
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;
  if (supabaseConfigured()) {
    await anonClient().auth.resetPasswordForEmail(email, { redirectTo: `${site}/` });
    return {};
  }
  const user = await getStore().findUserByEmail(email);
  if (!user) return {};
  const token = randomToken(32);
  await getStore().saveResetToken(sha256(token), user.id, new Date(Date.now() + 30 * 60_000).toISOString());
  const link = `${site}/#/reset?token=${token}`;
  // No email provider is configured in local mode. Log the link for the developer and, in
  // non-production demo mode only, show it on screen.
  console.info(`[auth] Password reset link for ${email}: ${link}`);
  return serverEnv.showDevResetLinks ? { devLink: link } : {};
}

export async function resetPassword(params: { token?: string; accessToken?: string }, password: string): Promise<string> {
  validatePassword(password);
  if (supabaseConfigured()) {
    if (!params.accessToken) throw new HttpError(400, "This reset link is invalid or has expired.", "bad_token");
    const admin = createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceKey, { auth: { persistSession: false } });
    const { data, error } = await admin.auth.getUser(params.accessToken);
    if (error || !data.user) throw new HttpError(400, "This reset link is invalid or has expired.", "bad_token");
    const upd = await admin.auth.admin.updateUserById(data.user.id, { password });
    if (upd.error) throw new HttpError(400, upd.error.message, "reset_failed");
    return data.user.id;
  }
  if (!params.token) throw new HttpError(400, "This reset link is invalid or has expired.", "bad_token");
  const userId = await getStore().takeResetToken(sha256(params.token));
  if (!userId) throw new HttpError(400, "This reset link is invalid or has expired.", "bad_token");
  await getStore().setPasswordHash(userId, await hashPassword(password));
  return userId;
}
