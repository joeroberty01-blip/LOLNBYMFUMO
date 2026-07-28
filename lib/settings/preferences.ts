import "server-only";
import { cookies } from "next/headers";

export type Language = "en" | "sw";
export type Theme = "light" | "dark" | "system";
export type FontSize = "sm" | "md" | "lg";

export const LANGUAGE_COOKIE = "lang";
export const THEME_COOKIE = "theme";
export const FONT_SIZE_COOKIE = "fontSize";

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Preferences = {
  language: Language;
  theme: Theme;
  fontSize: FontSize;
};

export async function getPreferences(): Promise<Preferences> {
  const store = await cookies();
  const language = store.get(LANGUAGE_COOKIE)?.value;
  const theme = store.get(THEME_COOKIE)?.value;
  const fontSize = store.get(FONT_SIZE_COOKIE)?.value;

  return {
    language: language === "sw" ? "sw" : "en",
    theme: theme === "dark" || theme === "light" ? theme : "system",
    fontSize: fontSize === "sm" || fontSize === "lg" ? fontSize : "md",
  };
}
