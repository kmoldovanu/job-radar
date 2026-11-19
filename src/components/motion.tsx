"use client";

import { domMax, LazyMotion, MotionConfig } from "motion/react";

/**
 * Motion per tutta l'app: caricamento leggero (componenti `m`) e "riduci movimento" del sistema rispettato
 * (con l'opzione attiva restano solo le dissolvenze, niente spostamenti).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Molla breve e senza rimbalzi, per tutto ciò che si sposta. */
export const spring = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;
/** Uscita rapida: scarta / candidati. */
export const exitFast = { duration: 0.18, ease: [0.4, 0, 1, 1] } as const;
export const easeOut = [0.16, 1, 0.3, 1] as const;
