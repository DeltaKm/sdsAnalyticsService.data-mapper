import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { storeUpdateSchema } from "@/lib/stores/schemas";
import { updateStore, StoreNotFoundError } from "@/lib/stores/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;

  try {
    const body = await request.json();
    const payload = storeUpdateSchema.parse(body);

    const store = await updateStore(storeId, payload);

    return Response.json({
      status: "success",
      data: {
        storeId: store.storeId,
        tenantId: store.tenantId,
        groupId: store.groupId,
        subgroupId: store.subgroupId,
        storeStatus: store.status,
        updatedAt: store.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ status: "error", error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof StoreNotFoundError) {
      return Response.json({ status: "error", error: error.message }, { status: 404 });
    }

    if (error instanceof ZodError) {
      return Response.json(
        { status: "error", error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error(`Failed to update store ${storeId}`, error);
    return Response.json({ status: "error", error: "Unable to update store" }, { status: 500 });
  }
}
