import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { storeCreateSchema } from "@/lib/stores/schemas";
import { createStore, StoreExistsError, TenantMissingError } from "@/lib/stores/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = storeCreateSchema.parse(body);

    const store = await createStore(payload);

    return Response.json(
      {
        status: "success",
        data: {
          storeId: store.storeId,
          tenantId: store.tenantId,
          groupId: store.groupId,
          subgroupId: store.subgroupId,
          storeStatus: store.status,
          updatedAt: store.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof StoreExistsError) {
      return Response.json({ status: "error", error: error.message }, { status: 409 });
    }

    if (error instanceof TenantMissingError) {
      return Response.json({ status: "error", error: error.message }, { status: 404 });
    }

    if (error instanceof ZodError) {
      return Response.json(
        { status: "error", error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create activity", error);
    return Response.json({ status: "error", error: "Unable to create activity" }, { status: 500 });
  }
}
