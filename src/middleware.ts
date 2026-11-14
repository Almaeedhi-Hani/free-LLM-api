import { NextRequest, NextResponse } from "next/server";
type Locale = "ar" | "en" | "zh";
const supported = new Set<Locale>(["ar", "en", "zh"]);
function preferredLanguage(header: string | null): Locale {
  const choices = (header || "").split(",").map((part) => {
    const [tag, ...params] = part.trim().split(";");
    const q = params.find((v) => v.trim().startsWith("q="));
    const weight = q ? Number(q.trim().slice(2)) : 1;
    return {tag: tag.toLowerCase(), weight: Number.isFinite(weight) ? weight : 0};
  }).filter((v) => v.weight > 0).sort((a,b) => b.weight - a.weight);
  for (const choice of choices) {
    const base = choice.tag.split("-")[0];
    if (base === "ar" || base === "en" || base === "zh") return base;
  }
  return "ar";
}
function preferred(req: NextRequest): Locale {
  const saved = req.cookies.get("site-language")?.value as Locale | undefined;
  if (saved && supported.has(saved)) return saved;
  return preferredLanguage(req.headers.get("accept-language"));
}
export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const match = pathname.match(/^\/(ar|en|zh)(?=\/|$)/);
  const lang: Locale = match ? match[1] as Locale : "ar";
  const stripped = match ? pathname.slice(match[0].length) || "/" : pathname;
  // Never redirect APIs, admin, assets or other non-editorial routes.
  if (stripped !== "/" && !stripped.startsWith("/services/")) return NextResponse.next();
  if (lang === "ar" && match) {
    const target = req.nextUrl.clone();
    target.pathname = stripped;
    return NextResponse.redirect(target, 308);
  }
  if (match) {
    const headers = new Headers(req.headers);
    headers.set("x-site-locale", lang);
    const target = req.nextUrl.clone();
    target.pathname = stripped;
    return NextResponse.rewrite(target, {request:{headers}});
  }
  // Only the landing page auto-selects a language. Service URLs retain stable
  // canonical URLs, and crawlers always see the default landing page.
  if (pathname === "/" && !/bot|crawler|spider|google|bing|yandex|baidu|duckduckgo|facebookexternalhit|twitterbot/i.test(req.headers.get("user-agent") || "")) {
    const selected = preferred(req);
    if (selected !== "ar") {
      const target = req.nextUrl.clone();
      target.pathname = `/${selected}`;
      const response = NextResponse.redirect(target, 307);
      response.headers.set("Vary", "Accept-Language, Cookie");
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  const headers = new Headers(req.headers);
  headers.set("x-site-locale", "ar");
  return NextResponse.next({request:{headers}});
}
export const config = {
  matcher: ["/", "/services/:path*", "/ar/:path*", "/en/:path*", "/zh/:path*"],
};
