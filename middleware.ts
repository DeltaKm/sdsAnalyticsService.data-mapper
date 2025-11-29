import { NextResponse, type NextRequest } from "next/server";

const API_KEY_HEADER = "x-api-key";
const protectedMessage = { error: "Unauthorized" } as const;

export function middleware(request: NextRequest) {
  const providedKey = request.headers.get(API_KEY_HEADER);
  const expectedKey = process.env.X_API_KEY;

  if (!expectedKey) {
    console.error("X_API_KEY env var is not configured");
    return NextResponse.json(protectedMessage, { status: 500 });
  }

  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json(protectedMessage, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/v1/:path*",
};
