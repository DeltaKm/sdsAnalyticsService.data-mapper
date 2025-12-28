import { NextRequest } from "next/server";

import { IngressSource } from "@/app/generated/prisma/enums";
import { handleRawIngressRequest } from "@/lib/ingress/handler";

export async function POST(request: NextRequest) {
  return handleRawIngressRequest(IngressSource.POS, request);
}
