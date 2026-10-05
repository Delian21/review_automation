"use client";

import { useEffect } from "react";

/**
 * Pauses the hero's ambient drift while the tab is hidden. CSS cannot observe
 * document visibility, so we reflect it onto <html> as a data attribute that
 * globals.css keys off. Without this the drift keeps compositing in the
 * background, which wastes battery on mobile.
 */
export function BlobDriftVisibility() {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      if (document.hidden) {
        root.setAttribute("data-tab-hidden", "true");
      } else {
        root.removeAttribute("data-tab-hidden");
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      root.removeAttribute("data-tab-hidden");
    };
  }, []);

  return null;
}