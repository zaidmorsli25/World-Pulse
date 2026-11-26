"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { sound } from "@/lib/client/sound";
import { NavIcon } from "./icons";

/** Accessible modal: focus moves in, Escape closes, focus is restored on close. */
export function Modal({
  open,
  onClose,
  children,
  label,
  wide,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        sound.play("close");
        onClose();
      }
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div
            className="absolute inset-0 bg-navy-950/55 backdrop-blur-[2px]"
            onClick={() => {
              sound.play("close");
              onClose();
            }}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className={`panel relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-b-none outline-none sm:rounded-b-3xl ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"} ${className}`}
          >
            <button
              onClick={() => {
                sound.play("close");
                onClose();
              }}
              className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-navy-900/70 text-white transition hover:bg-navy-900"
              aria-label="Close"
            >
              <NavIcon.close size={18} />
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
