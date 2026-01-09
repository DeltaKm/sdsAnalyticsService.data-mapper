import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { businessUnitUpdateSchema } from "@/lib/business-units/schemas";
import { BusinessUnitNotFoundError, getBusinessUnit, updateBusinessUnit } from "@/lib/business-units/service";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ uniqueKey: string }> }
) {
  const { uniqueKey } = await context.params;

  try {
    const body = await request.json();
    const payload = businessUnitUpdateSchema.parse({ ...body, uniqueKey });

    const bu = await updateBusinessUnit(uniqueKey, payload);

    return Response.json(
      {
        status: "success",
        data: bu,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ status: "error", error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof BusinessUnitNotFoundError) {
      return Response.json({ status: "error", error: error.message }, { status: 404 });
    }

    if (error instanceof ZodError) {
      return Response.json({ status: "error", error: "Validation failed", issues: error.issues }, { status: 400 });
    }

    console.error(`Failed to update business unit ${uniqueKey}`, error);
    return Response.json({ status: "error", error: "Unable to update business unit" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ uniqueKey: string }> }
) {
  const { uniqueKey } = await context.params;

  try {
    const bu = await getBusinessUnit(uniqueKey);
    return Response.json(
      {
        status: "success",
        data: bu,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof BusinessUnitNotFoundError) {
      return Response.json({ status: "error", error: error.message }, { status: 404 });
    }

    console.error(`Failed to get business unit ${uniqueKey}`, error);
    return Response.json({ status: "error", error: "Unable to get business unit" }, { status: 500 });
  }
}
