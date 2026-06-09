"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type NavProgressValue = {
  /** Href the user just tapped, before the route has finished changing. */
  pendingHref: string | null;
  /** Call on tap to move the highlight + show the top bar instantly. */
  start: (href: string) => void;
};

const NavProgressContext = createContext<NavProgressValue | null>(null);

/** Returns null when rendered outside the provider (e.g. logged-out pages). */
export function useNavProgress(): NavProgressValue | null {
  return useContext(NavProgressContext);
}

export function NavProgressProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Once the URL actually changes the navigation is done — drop the pending
  // state so the highlight settles on the real active route.
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const start = (href: string) => {
    if (href !== pathname) setPendingHref(href);
  };

  return (
    <NavProgressContext.Provider value={{ pendingHref, start }}>
      <TopProgressBar active={pendingHref !== null} />
      {children}
    </NavProgressContext.Provider>
  );
}

/**
 * Slim indeterminate bar pinned to the top of the viewport. Ramps up while a
 * navigation is in flight, then snaps to 100% and fades once it lands. Gives
 * immediate "your tap registered" feedback even before the page renders.
 */
function TopProgressBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (active) {
      started.current = true;
      setVisible(true);
      setWidth(8);
      const a = setTimeout(() => setWidth(55), 60);
      const b = setTimeout(() => setWidth(82), 350);
      return () => {
        clearTimeout(a);
        clearTimeout(b);
      };
    }
    if (started.current) {
      started.current = false;
      setWidth(100);
      const done = setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 260);
      return () => clearTimeout(done);
    }
  }, [active]);

  return (
    <div
      aria-hidden
      style={{ viewTransitionName: "top-progress" }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 pointer-events-none"
    >
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-names via-rewards to-hospital shadow-[0_0_10px] shadow-rewards/40 transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  );
}
