import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      status: "error",
      error: "Business units endpoint disabled for initial deploy",
    },
    { status: 501 }
  );
}
