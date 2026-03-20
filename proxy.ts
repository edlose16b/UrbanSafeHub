import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  detectLocaleFromAcceptLanguage,
  SUPPORTED_LOCALES,
} from "./app/i18n/config";

function pathnameHasLocale(pathname: string): boolean {
  return SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  if (pathnameHasLocale(pathname)) {
    return NextResponse.next();
  }

  const locale = detectLocaleFromAcceptLanguage(
    request.headers.get("accept-language"),
  );
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
