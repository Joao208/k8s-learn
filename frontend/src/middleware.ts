import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/sandbox")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const proto = request.headers.get("x-forwarded-proto");

  if (forwardedFor) response.headers.set("x-forwarded-for", forwardedFor);
  if (realIp) response.headers.set("x-real-ip", realIp);
  if (proto) response.headers.set("x-forwarded-proto", proto);

  return response;
}

export const config = {
  matcher: "/api/sandbox/:path*",
};
