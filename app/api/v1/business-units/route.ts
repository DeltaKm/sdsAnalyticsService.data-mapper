import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { businessUnitCreateSchema } from "@/lib/business-units/schemas";
import { BusinessUnitExistsError, createBusinessUnit } from "@/lib/business-units/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = businessUnitCreateSchema.parse(body);

    const bu = await createBusinessUnit(payload);

    return Response.json(
      {
        status: "success",
        data: bu,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ status: "error", error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof BusinessUnitExistsError) {
      return Response.json({ status: "error", error: error.message }, { status: 409 });
    }

    if (error instanceof ZodError) {
      return Response.json({ status: "error", error: "Validation failed", issues: error.issues }, { status: 400 });
    }

    console.error("Failed to create business unit", error);
    return Response.json({ status: "error", error: "Unable to create business unit" }, { status: 500 });
  }
}
