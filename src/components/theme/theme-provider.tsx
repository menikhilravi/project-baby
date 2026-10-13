"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  THEME_COLORS,
  THEME_COOKIE,
  type Accent,
  type ThemePref,
} from "@/lib/theme";

type ThemeValue = {
  pref: ThemePref;
  /** What is actually on screen right now ("system" resolved). */
  resolved: "light" | "night";
  /** Switch theme; pass the tap point to grow the new theme out of it. */
  setPref: (next: ThemePref, origin?: { x: number; y: number }) => void;
  /** Optimistically repaint the accent (settings preview) before the save lands. */
  previewAccent: (accent: Accent) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeScheme(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function ThemeProvider({
  initialPref,
  children,
}: {
  initialPref: ThemePref;
  children: ReactNode;
}) {
  const [pref, setPrefState] = useState<ThemePref>(initialPref);
  const systemDark = useSyncExternalStore(
    subscribeScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  const resolved =
    pref === "night" || (pref === "system" && systemDark) ? "night" : "light";

  const setPref = useCallback(
    (next: ThemePref, origin?: { x: number; y: number }) => {
      document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      const root = document.documentElement;
      const apply = () => {
        root.dataset.theme = next;
        syncThemeColorMeta(next);
      };

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
        activeViewTransition?: unknown;
      };
      if (origin && doc.startViewTransition && !reduced && !doc.activeViewTransition) {
        root.style.setProperty("--reveal-x", `${origin.x}px`);
        root.style.setProperty("--reveal-y", `${origin.y}px`);
        root.classList.add("theme-reveal");
        doc
          .startViewTransition(apply)
          .finished.finally(() => root.classList.remove("theme-reveal"));
      } else {
        apply();
      }
      setPrefState(next);
    },
    [],
  );

  // Decorative CSS loops (mascot breathing, milk waves) pause while hidden.
  useEffect(() => {
    const sync = () => {
      if (document.hidden) document.documentElement.dataset.hidden = "";
      else delete document.documentElement.dataset.hidden;
    };
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const previewAccent = useCallback((accent: Accent) => {
    document.documentElement.dataset.accent = accent;
  }, []);

  return (
    <ThemeContext.Provider value={{ pref, resolved, setPref, previewAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/** Keep the browser/PWA status bar in step with a client-side theme change. */
function syncThemeColorMeta(pref: ThemePref) {
  // Mutate the server-rendered tags in place (React owns those nodes, so we
  // never remove them); the next server render agrees via the cookie.
  const metas = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
  if (metas.length === 0) {
    const m = document.createElement("meta");
    m.name = "theme-color";
    document.head.appendChild(m);
    metas.push(m);
  }
  if (pref === "system" && metas.length >= 2) {
    metas[0].content = THEME_COLORS.light;
    metas[0].media = "(prefers-color-scheme: light)";
    metas[1].content = THEME_COLORS.night;
    metas[1].media = DARK_QUERY;
    return;
  }
  const night =
    pref === "night" ||
    (pref === "system" && window.matchMedia(DARK_QUERY).matches);
  for (const m of metas) {
    m.content = night ? THEME_COLORS.night : THEME_COLORS.light;
    m.removeAttribute("media");
  }
}
