import { headers } from "next/headers";
export type Locale = "ar" | "en" | "zh";
export function getLocale(): Locale {
  const value = headers().get("x-site-locale");
  return value === "en" || value === "zh" ? value : "ar";
}
export function localizedPath(lang: Locale, path = "/") {
  return lang === "ar" ? path : `/${lang}${path === "/" ? "" : path}`;
}
