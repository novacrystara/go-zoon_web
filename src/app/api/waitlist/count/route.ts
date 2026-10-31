import { NextResponse } from "next/server";
import { getWaitlistCount } from "@/lib/waitlist-db";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieve the live count of unique registered waitlist members from Supabase.
 */
export async function GET() {
  try {
    const count = await getWaitlistCount();
    return NextResponse.json(
      {
        success: true,
        count,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[Waitlist Count API Error]:", error);
    // Never silently return 0 on database failure; return 500 error status
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve waitlist count from database.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

