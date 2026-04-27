import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type RetroIntensity = "off" | "low" | "high";

const STORAGE_KEY = "retro-intensity";

type Ctx = {
  intensity: RetroIntensity;
  setIntensity: (v: RetroIntensity) => void;
};

const RetroContext = createContext<Ctx | null>(null);

export function RetroProvider({ children }: { children: ReactNode }) {
  const [intensity, setIntensityState] = useState<RetroIntensity>("high");

  // Load persisted preference on mount (client only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as RetroIntensity | null;
    if (stored === "off" || stored === "low" || stored === "high") {
      setIntensityState(stored);
    }
  }, []);

  // Reflect on <html> so CSS can react globally.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.retro = intensity;
  }, [intensity]);

  const setIntensity = (v: RetroIntensity) => {
    setIntensityState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, v);
    }
  };

  return <RetroContext.Provider value={{ intensity, setIntensity }}>{children}</RetroContext.Provider>;
}

export function useRetro() {
  const ctx = useContext(RetroContext);
  if (!ctx) throw new Error("useRetro must be used within RetroProvider");
  return ctx;
}
