import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { tenantCreateSchema } from "@/lib/tenants/schemas";
import { createTenant, TenantExistsError } from "@/lib/tenants/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = tenantCreateSchema.parse(body);

    const tenant = await createTenant(payload);

    return Response.json(
      {
        status: "success",
        data: {
          tenantId: tenant.tenantId,
          name: tenant.name,
          metadata: tenant.metadata,
          createdAt: tenant.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ status: "error", error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof TenantExistsError) {
      return Response.json({ status: "error", error: error.message }, { status: 409 });
    }

    if (error instanceof ZodError) {
      return Response.json(
        { status: "error", error: "Validation failed", issues: error.issues },
        { status: 400 }
      );
    }

    console.error("Failed to create tenant", error);
    return Response.json({ status: "error", error: "Unable to create tenant" }, { status: 500 });
  }
}
