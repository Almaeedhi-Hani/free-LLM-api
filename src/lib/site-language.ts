import { cookies } from "next/headers";
export type Locale = "ar" | "en" | "zh";
export function getLocale(): Locale {
  const value = cookies().get("site-language")?.value;
  return value === "en" || value === "zh" ? value : "ar";
}
