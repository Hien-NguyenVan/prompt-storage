"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("theme", next); } catch {}
  }

  return (
    <button onClick={toggle} type="button" title={theme === "dark" ? "Chuyển sang Light" : "Chuyển sang Dark"}
      className="text-sm px-2 py-1 border rounded hover:bg-slate-50 dark:hover:bg-slate-800">
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
