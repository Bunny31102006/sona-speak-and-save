import { useEffect, useState } from "react";

/** Display/accessibility preferences, persisted locally and applied as <html> classes. */
export interface DisplaySettings {
  light: boolean;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

const KEY = "sona.display.v1";
const DEFAULTS: DisplaySettings = { light: false, largeText: false, highContrast: false, reduceMotion: false };

export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULTS);

  // Read after hydration to avoid SSR mismatch; honour OS reduced-motion by default.
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (stored) return setSettings({ ...DEFAULTS, ...stored });
    } catch {
      /* ignore */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSettings((s) => ({ ...s, reduceMotion: true }));
    }
  }, []);

  useEffect(() => {
    const c = document.documentElement.classList;
    c.toggle("theme-light", settings.light);
    c.toggle("large-text", settings.largeText);
    c.toggle("high-contrast", settings.highContrast);
    c.toggle("reduce-motion", settings.reduceMotion);
  }, [settings]);

  const update = (patch: Partial<DisplaySettings>) =>
    setSettings((s) => {
      const next = { ...s, ...patch };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });

  return { settings, update };
}
