import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    {
      status: "error",
      error: "Stores endpoint disabled for initial deploy",
    },
    { status: 501 }
  );
}
