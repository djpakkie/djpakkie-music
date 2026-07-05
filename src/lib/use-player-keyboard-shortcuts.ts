import { useEffect } from "react";
import { usePlayer } from "@/lib/player-context";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Space = play/pause, ←/→ = seek 5s, ↑/↓ = volume, N/P = next/prev.
 * Ignored while typing in a form field.
 */
export function usePlayerKeyboardShortcuts() {
  const { current, toggle, next, prev, seek, progress, duration, volume, setVolume } = usePlayer();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!current || isTypingTarget(e.target)) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(Math.min(duration || progress, progress + 5));
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(Math.max(0, progress - 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume(volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(volume - 0.05);
          break;
        case "KeyN":
          next();
          break;
        case "KeyP":
          prev();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, toggle, next, prev, seek, progress, duration, volume, setVolume]);
}
