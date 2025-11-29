import { NextRequest } from "next/server";

import { IngressSource } from "@/app/generated/prisma/enums";
import { handleIngressRequest } from "@/lib/ingress/handler";

export async function POST(request: NextRequest) {
  return handleIngressRequest(IngressSource.POS, request);
}
