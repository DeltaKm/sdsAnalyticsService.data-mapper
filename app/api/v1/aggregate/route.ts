import { NextRequest, NextResponse } from "next/server";
import { aggregateSales } from "@/lib/aggregator/service";

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Manual aggregation triggered");
    
    await aggregateSales();
    
    console.log("✅ Manual aggregation completed");
    
    return NextResponse.json({ 
      success: true, 
      message: "Aggregation completed successfully" 
    });
  } catch (error) {
    console.error("❌ Manual aggregation failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Aggregation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
