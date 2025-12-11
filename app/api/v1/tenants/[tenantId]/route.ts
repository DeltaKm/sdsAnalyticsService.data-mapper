import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { tenantUpdateSchema } from "@/lib/tenants/schemas";
import { updateTenant, TenantNotFoundError } from "@/lib/tenants/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  try {
    const body = await request.json();
    const payload = tenantUpdateSchema.parse(body);

    const tenant = await updateTenant(tenantId, payload);

    return Response.json({
      status: "success",
      data: {
        tenantId: tenant.tenantId,
        name: tenant.name,
        metadata: tenant.metadata,
        updatedAt: tenant.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ status: "error", error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof TenantNotFoundError) {
      return Response.json({ status: "error", error: error.message }, { status: 404 });
    }

    if (error instanceof ZodError) {
      return Response.json(
        { status: "error", error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error(`Failed to update tenant ${tenantId}`, error);
    return Response.json({ status: "error", error: "Unable to update tenant" }, { status: 500 });
  }
}
