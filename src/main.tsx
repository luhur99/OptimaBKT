import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

const THEME_STORAGE_KEY = "optima-theme";
const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
const initialTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";

if (initialTheme === "dark") {
	document.documentElement.classList.add("dark");
} else {
	document.documentElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
