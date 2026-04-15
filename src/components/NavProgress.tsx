"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timers = useRef<any[]>([]);

  // Reset when pathname/search actually changes (= navigation finished)
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    setProgress(100);
    const t = setTimeout(() => { setVisible(false); setProgress(0); }, 250);
    timers.current.push(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Intercept internal link clicks to show progress immediately
  useEffect(() => {
    function start() {
      setVisible(true);
      setProgress(10);
      timers.current.forEach(clearTimeout);
      const steps = [
        setTimeout(() => setProgress(40), 100),
        setTimeout(() => setProgress(65), 300),
        setTimeout(() => setProgress(85), 800),
      ];
      timers.current.push(...steps);
    }
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || a.target === "_blank") return;
      start();
    }
    function onSubmit(_e: Event) { start(); }
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 h-0.5 pointer-events-none transition-opacity ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="h-full bg-brand-500 transition-[width] duration-200 ease-out shadow-[0_0_8px_rgba(99,102,241,0.7)]"
        style={{ width: `${progress}%` }} />
    </div>
  );
}
