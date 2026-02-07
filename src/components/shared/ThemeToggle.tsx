import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "optima-theme";

type Theme = "light" | "dark";

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
};

const applyTheme = (theme: Theme) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const initialTheme = getStoredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const handleToggle = () => {
    setTheme((prev) => {
      const nextTheme: Theme = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      applyTheme(nextTheme);
      return nextTheme;
    });
  };

  const isDark = theme === "dark";

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        type="button"
        onClick={handleToggle}
        variant="outline"
        className="flex items-center gap-2 rounded-full border border-border bg-background/80 text-foreground shadow-lg backdrop-blur"
        aria-label={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="text-sm">{isDark ? "Terang" : "Gelap"}</span>
      </Button>
    </div>
  );
};
