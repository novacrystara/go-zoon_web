import { NextRequest, NextResponse } from "next/server";
import { validateContactForm } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limiter";
import { upsertWaitlistMember, getWaitlistCount } from "@/lib/waitlist-db";
import { sendWaitlistNotificationEmail } from "@/lib/brevo";
import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * GET: Retrieve the live count of unique registered waitlist members.
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
    console.error("[Waitlist Count GET Error]:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve waitlist count." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

/**
 * POST: Process waitlist registration, verify CAPTCHA, upsert into Supabase, and dispatch Brevo email.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Safe JSON parsing
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    // 2. Extract Client IP for logging and rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = (forwarded ? forwarded.split(",")[0] : realIp || "127.0.0.1").trim();

    // 3. Honeypot check (spam bots commonly fill every field)
    const rawData = body as Record<string, unknown> | null;
    if (rawData && typeof rawData.website === "string" && rawData.website.trim().length > 0) {
      console.warn(`[Spam Blocked]: Honeypot triggered from IP: ${clientIp}`);
      let count = 0;
      try {
        count = await getWaitlistCount();
      } catch {
        // Fallback silently for spam
      }
      return NextResponse.json({
        success: true,
        message: "Thank you for joining the waitlist!",
        count,
      });
    }

    // 4. Rate Limiting Check
    const rateLimit = await checkRateLimit(clientIp);
    const rateLimitHeaders = {
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": rateLimit.reset.toString(),
    };

    if (!rateLimit.success) {
      console.warn(`[Rate Limit Exceeded]: IP ${clientIp} exceeded waitlist submission limits.`);
      return NextResponse.json(
        {
          success: false,
          error: "Too many submission attempts. Please wait a few minutes before trying again.",
        },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders,
            "Retry-After": Math.max(1, rateLimit.reset - Math.floor(Date.now() / 1000)).toString(),
          },
        }
      );
    }

    // 5. Input Validation
    const validation = validateContactForm(body);
    if (!validation.valid || !validation.sanitizedData) {
      return NextResponse.json(
        {
          success: false,
          error: "Please check your inputs and try again.",
          errors: validation.errors,
        },
        {
          status: 400,
          headers: rateLimitHeaders,
        }
      );
    }

    // 6. Cloudflare Turnstile CAPTCHA Verification
    // Must be verified BEFORE database writes, counter queries, or email sending
    const turnstileToken =
      typeof rawData?.turnstileToken === "string" ? rawData.turnstileToken.trim() : "";

    const turnstileResult = await verifyTurnstileToken({
      token: turnstileToken,
      remoteip: clientIp,
    });

    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: turnstileResult.error || "Security verification failed. Please try again.",
        },
        {
          status: 403,
          headers: rateLimitHeaders,
        }
      );
    }

    const { role, fullName, email, phone, message } = validation.sanitizedData;

    // 7. Atomic Supabase Database Upsert
    let updatedCount = 0;
    try {
      const dbResult = await upsertWaitlistMember({
        role,
        fullName,
        email,
        phone,
        message,
      });
      updatedCount = dbResult.count;
    } catch (dbError) {
      console.error("[Contact API DB Error]:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: "Unable to process your registration at this moment. Please try again later.",
        },
        {
          status: 500,
          headers: rateLimitHeaders,
        }
      );
    }

    // 8. Dispatch Email Notification via Brevo
    const emailResult = await sendWaitlistNotificationEmail({
      role,
      fullName,
      email,
      phone,
      message,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || "Failed to send notification email. Please try again later.",
          count: updatedCount,
        },
        {
          status: emailResult.statusCode || 500,
          headers: rateLimitHeaders,
        }
      );
    }

    // 9. Return Success with updated verified member count
    return NextResponse.json(
      {
        success: true,
        message: "Thank you for joining the GO-ZOON waitlist! We have received your details.",
        messageId: emailResult.messageId,
        count: updatedCount,
      },
      {
        status: 201,
        headers: rateLimitHeaders,
      }
    );
  } catch (error) {
    console.error("[Contact API Internal Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected server error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}
