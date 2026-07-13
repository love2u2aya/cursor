import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isFpArea = pathname.startsWith("/fp");
  const isLogin = pathname === "/fp/login";
  const hasSession = Boolean(request.cookies.get("fp_session")?.value);

  if (isFpArea && !isLogin && !hasSession) {
    return NextResponse.redirect(new URL("/fp/login", request.url));
  }

  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL("/fp/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/fp/:path*"],
};
