import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/(ar|en|zh)(?=\/|$)/);
  const lang = match?.[1] || "ar";
  const stripped = match
    ? req.nextUrl.pathname.slice(match[0].length) || "/"
    : req.nextUrl.pathname;
  // Locale rewrites apply only to public editorial pages, never admin or APIs.
  if (stripped !== "/" && !stripped.startsWith("/services/"))
    return NextResponse.next();
  if (lang === "ar" && match) {
    const target = req.nextUrl.clone();
    target.pathname = stripped;
    return NextResponse.redirect(target, 308);
  }
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-site-locale", lang);
  if (match) {
    const target = req.nextUrl.clone();
    target.pathname = stripped;
    return NextResponse.rewrite(target, {
      request: { headers: requestHeaders },
    });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}
export const config = {
  matcher: ["/ar/:path*", "/en/:path*", "/zh/:path*"],
};
