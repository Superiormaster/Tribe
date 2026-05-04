// middleware.ts
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only block /main pages if you want server-side safety
  if (pathname.startsWith("/main")) {
    // Let frontend handle auth check
    return NextResponse.next();
  }

  // Otherwise, allow landing/auth pages
  return NextResponse.next();
}

export const config = {
  matcher: ["/main/:path*"],
};