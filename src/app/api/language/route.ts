import { NextRequest, NextResponse } from "next/server";
export function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get("lang") || "ar";
  const target = req.nextUrl.searchParams.get("returnTo") || "/";
  const safePath =
    target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")
      ? target
      : "/";
  // Keep redirects relative so the cookie remains on the original host,
  // including reverse proxies and localhost previews.
  const localized =
    lang === "en" || lang === "zh"
      ? `/${lang}${safePath === "/" ? "" : safePath}`
      : safePath;
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: localized },
  });
  response.cookies.set(
    "site-language",
    ["ar", "en", "zh"].includes(lang) ? lang : "ar",
    { path: "/", sameSite: "lax", maxAge: 31536000, httpOnly: true },
  );
  return response;
}
