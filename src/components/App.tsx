"use client";
import { useCallback, useEffect, useState } from "react";
import { getBackend, type Backend, type Me } from "@/lib/client/backend";
import { GameProvider } from "./game/GameProvider";
import { GameShell } from "./game/GameShell";
import { Landing } from "./landing/Landing";

function isResetLink() {
  const h = typeof window !== "undefined" ? window.location.hash : "";
  return h.startsWith("#/reset") || (h.includes("access_token=") && h.includes("type=recovery"));
}

/** Supabase sends players back from the confirmation email with a one-time token in the hash. */
function readConfirmLink(): { token?: string; error?: string } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const confirmed = new URLSearchParams(window.location.search).has("confirmed");
  if (params.get("access_token") && params.get("type") === "signup") return { token: params.get("access_token")! };
  if (confirmed && params.get("error"))
    return { error: params.get("error_code") === "otp_expired" ? "That confirmation link has expired. Log in to get a new one." : "That confirmation link didn't work. Try logging in." };
  return confirmed ? {} : null;
}

function cleanUrl() {
  window.history.replaceState(null, "", window.location.pathname + "#/map");
}

/**
 * WorldPulse behaves like an app: pinching or Ctrl+scrolling zooms the map, never the whole page.
 * (The map itself listens for those gestures; everywhere else they are ignored.)
 */
function useNoPageZoom() {
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
    };
    const gesture = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", wheel, { passive: false, capture: true });
    window.addEventListener("keydown", keys, { capture: true });
    for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, gesture, { passive: false });
    return () => {
      window.removeEventListener("wheel", wheel, { capture: true });
      window.removeEventListener("keydown", keys, { capture: true });
      for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.removeEventListener(t, gesture);
    };
  }, []);
}

export default function App() {
  useNoPageZoom();
  const [backend, setBackend] = useState<Backend | null>(null);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const b = await getBackend();
      setBackend(b);
      if (isResetLink()) {
        setReset(true);
        setMe(null);
        return;
      }
      setReset(false);
      const confirm = readConfirmLink();
      if (confirm) {
        cleanUrl();
        if (confirm.token) {
          try {
            await b.confirmEmail(confirm.token);
          } catch (e) {
            setNotice((e as Error).message);
          }
        } else if (confirm.error) setNotice(confirm.error);
      }
      setMe(await b.me());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (error)
    return (
      <div className="grid h-dvh place-items-center bg-navy-900 p-6 text-center text-white">
        <div>
          <p className="font-display text-2xl">WorldPulse could not start.</p>
          <p className="mt-2 text-white/70">{error}</p>
          <button className="btn btn-primary mt-5" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  if (!backend || me === undefined)
    return (
      <div className="grid h-dvh place-items-center bg-navy-900">
        <div className="animate-pulse font-display text-3xl font-bold text-white">
          World<span className="text-gold-400">Pulse</span>
        </div>
      </div>
    );
  if (!me) return <Landing backend={backend} onAuthed={() => void refresh()} initialMode={reset ? "reset" : notice ? "login" : undefined} notice={notice} />;
  return (
    <GameProvider backend={backend} initial={me} onLogout={() => setMe(null)}>
      <GameShell />
    </GameProvider>
  );
}
