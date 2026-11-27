"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Backend } from "@/lib/client/backend";
import { sound } from "@/lib/client/sound";
import { CategoryIcon, NavIcon } from "../ui/icons";
import { Globe } from "./Globe";

type Mode = "login" | "signup" | "forgot" | "reset";

export function Landing({ backend, onAuthed, initialMode, notice }: { backend: Backend; onAuthed: () => void; initialMode?: Mode; notice?: string | null }) {
  const [mode, setMode] = useState<Mode>(initialMode ?? "signup");
  const [showPw, setShowPw] = useState(false);
  /** Set after sign-up while we wait for the player to click the link in their email. */
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [globeSize, setGlobeSize] = useState(520);

  useEffect(() => {
    const f = () => setGlobeSize(Math.min(560, Math.max(260, Math.min(window.innerWidth * 0.42, window.innerHeight * 0.62))));
    f();
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);

  // While waiting for email confirmation, check every few seconds. As soon as the player clicks
  // the link (in any tab or on their phone), this tab logs in by itself.
  useEffect(() => {
    if (!waitingFor) return;
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      try {
        const status = await backend.pendingSignup();
        if (status === "confirmed") {
          sound.play("achievement");
          onAuthed();
          return;
        }
        if (status === "none") return;
      } catch {
        /* keep waiting */
      }
      if (Date.now() - started < 60 * 60_000) timer = window.setTimeout(tick, document.hidden ? 8000 : 3500);
    };
    let timer = window.setTimeout(tick, 3500);
    const onFocus = () => {
      window.clearTimeout(timer);
      void tick();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [waitingFor, backend, onAuthed]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
    setDevLink(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    sound.play("click");
    try {
      if (mode === "signup") {
        const r = await backend.signup(email, username, password);
        if (r.needsConfirmation) setWaitingFor(email.trim());
        else onAuthed();
      } else if (mode === "login") {
        await backend.login(email, password);
        onAuthed();
      } else if (mode === "forgot") {
        const r = await backend.forgot(email);
        setInfo(r.message);
        setDevLink(r.devLink ?? null);
      } else {
        const hash = window.location.hash;
        const token = new URLSearchParams(hash.split("?")[1] ?? "").get("token") ?? undefined;
        const accessToken = new URLSearchParams(hash.replace(/^#/, "")).get("access_token") ?? undefined;
        await backend.reset({ token, accessToken }, password);
        window.history.replaceState(null, "", window.location.pathname + "#/map");
        onAuthed();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const standalone = backend.kind === "browser";

  return (
    <div className="relative h-dvh overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_30%_20%,#24406f_0%,#0d1a2e_55%,#08111f_100%)] text-white">
      {/* starfield */}
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(1px 1px at 20% 30%, #fff, transparent), radial-gradient(1px 1px at 70% 20%, #fff, transparent), radial-gradient(1.5px 1.5px at 85% 70%, #fff, transparent), radial-gradient(1px 1px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 10% 60%, #fff, transparent)" }} />
      <div className="relative mx-auto grid min-h-dvh max-w-7xl items-center gap-8 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-4 flex items-center gap-3">
            <svg width="52" height="52" viewBox="0 0 64 64" aria-hidden>
              <rect width="64" height="64" rx="16" fill="#1a5c96" />
              <circle cx="32" cy="32" r="20" fill="#2d86cc" stroke="#fbd97e" strokeWidth="3" />
              <path d="M8 32h8l4-8 6 16 5-10h25" fill="none" stroke="#f7c552" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              World<span className="text-gold-400">Pulse</span>
            </span>
          </div>
          <h1 className="max-w-xl font-display text-2xl font-semibold leading-tight text-white/95 sm:text-3xl">Understand the world in a few minutes a day, and have fun doing it.</h1>
          <p className="mt-3 max-w-lg text-white/75">
            Explore a living world map, open mission briefings on real events from trusted newsrooms, answer quick quizzes, earn coins and climb from Recruit to Global Strategist.
          </p>
          <div className="mt-6 hidden lg:block">
            <Globe size={globeSize} />
          </div>
          <div className="mt-6 lg:hidden">
            <Globe size={Math.min(globeSize, 300)} />
          </div>
          <ul className="mt-6 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
            {[
              { c: "diplomacy" as const, t: "Briefings", d: "2 to 4 minute explainers with sources." },
              { c: "organizations" as const, t: "World map", d: "Every country, leader and live event." },
              { c: "economy" as const, t: "Progress", d: "Coins, ranks, streaks and your own HQ." },
            ].map((f) => (
              <li key={f.t} className="flex gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-400 text-navy-900">
                  <CategoryIcon category={f.c} size={22} />
                </span>
                <span>
                  <b className="font-display">{f.t}</b>
                  <span className="block text-sm text-white/70">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="panel w-full max-w-md justify-self-center p-6 text-navy-900 sm:p-8">
          {mode !== "reset" && !waitingFor && (
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-parchment-200 p-1" role="tablist" aria-label="Account">
              {(["signup", "login"] as const).map((m) => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={`rounded-xl py-2 font-display font-semibold transition ${mode === m ? "bg-white shadow" : "text-navy-700 hover:bg-white/50"}`}>
                  {m === "signup" ? "Create account" : "Log in"}
                </button>
              ))}
            </div>
          )}
          <AnimatePresence mode="wait">
            {waitingFor ? (
              <motion.div key="waiting" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-ocean-500/15 text-ocean-600">
                  <svg width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden>
                    <rect x="4" y="7" width="24" height="18" rx="3" />
                    <path d="M5 9l11 8 11-8" />
                  </svg>
                </div>
                <h2 className="font-display text-2xl font-bold">Check your inbox</h2>
                <p className="text-navy-800">
                  We sent a link to <b className="break-all">{waitingFor}</b>. Click it to confirm your email, and you&apos;ll be taken straight into the game.
                </p>
                <p className="flex items-center justify-center gap-2 text-sm text-navy-700/80" role="status">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-land-500" />
                  This page will log you in by itself once you confirm.
                </p>
                <p className="text-xs text-navy-700/70">Can&apos;t find it? Check your spam or promotions folder.</p>
                <button
                  type="button"
                  className="text-sm font-semibold text-ocean-700 hover:underline"
                  onClick={() => {
                    setWaitingFor(null);
                    switchMode("login");
                  }}
                >
                  I already confirmed. Log in instead
                </button>
              </motion.div>
            ) : (
            <motion.form key={mode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} onSubmit={submit} className="space-y-3.5">
              <h2 className="font-display text-2xl font-bold">
                {mode === "signup" ? "Start your career" : mode === "login" ? "Welcome back, analyst" : mode === "forgot" ? "Reset your password" : "Choose a new password"}
              </h2>
              {(mode === "signup" || mode === "forgot") && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Email</span>
                  <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              )}
              {mode === "login" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Email or username</span>
                  <input className="input" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
              )}
              {mode === "signup" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">Username</span>
                  <input className="input" autoComplete="nickname" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_.\-]{3,20}" value={username} onChange={(e) => setUsername(e.target.value)} />
                  <span className="mt-1 block text-xs text-navy-700/70">3–20 letters, numbers, dots, dashes or underscores.</span>
                </label>
              )}
              {mode !== "forgot" && (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">{mode === "reset" ? "New password" : "Password"}</span>
                  <span className="relative block">
                    <input
                      className="input pr-12"
                      type={showPw ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      minLength={mode === "login" ? 1 : 8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 right-1 my-auto grid h-9 w-10 place-items-center rounded-lg text-navy-700/70 transition hover:bg-parchment-200 hover:text-navy-900"
                      aria-label={showPw ? "Hide password" : "Show password"}
                      aria-pressed={showPw}
                      title={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <NavIcon.eyeOff size={20} /> : <NavIcon.eye size={20} />}
                    </button>
                  </span>
                  {mode !== "login" && <span className="mt-1 block text-xs text-navy-700/70">At least 8 characters, with a letter and a number.</span>}
                </label>
              )}
              {error && (
                <p className="rounded-xl bg-[#fde8e8] px-3 py-2 text-sm font-medium text-[#8a1c1c]" role="alert">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-xl bg-land-500/15 px-3 py-2 text-sm text-land-600" role="status">
                  {info}
                </p>
              )}
              {devLink && (
                <p className="break-all rounded-xl bg-gold-300/30 px-3 py-2 text-xs text-navy-800">
                  Demo mode has no email service, so here is your reset link:{" "}
                  <a className="font-semibold underline" href={devLink} onClick={() => setTimeout(() => location.reload(), 50)}>
                    open reset page
                  </a>
                </p>
              )}
              <button className="btn btn-primary w-full text-lg" disabled={busy}>
                {busy ? "One moment…" : mode === "signup" ? "Create account & play" : mode === "login" ? "Log in" : mode === "forgot" ? "Send reset link" : "Save password"}
              </button>
              <div className="flex justify-between text-sm">
                {mode === "login" ? (
                  <button type="button" className="font-semibold text-ocean-700 hover:underline" onClick={() => switchMode("forgot")}>
                    Forgot password?
                  </button>
                ) : mode !== "signup" ? (
                  <button type="button" className="font-semibold text-ocean-700 hover:underline" onClick={() => switchMode("login")}>
                    ← Back to log in
                  </button>
                ) : (
                  <span />
                )}
              </div>
              {standalone && <p className="text-xs text-navy-700/70">Offline demo: your account and progress are saved only in this browser.</p>}
            </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
