/**
 * Server-side Cloudflare Turnstile verification utility.
 * Verifies Turnstile tokens using the Cloudflare Siteverify API.
 */

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
  hostname?: string;
  errorCodes?: string[];
}

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify Cloudflare Turnstile response token on the server.
 */
export async function verifyTurnstileToken(params: {
  token: string | null | undefined;
  remoteip?: string;
}): Promise<TurnstileVerificationResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  // If secret key is not configured, log a server warning
  if (!secretKey) {
    console.error("[Turnstile Server Error]: TURNSTILE_SECRET_KEY is not configured.");
    return {
      success: false,
      error: "Security verification is misconfigured on the server.",
    };
  }

  // Check if token was provided
  if (!params.token || typeof params.token !== "string" || params.token.trim().length === 0) {
    return {
      success: false,
      error: "Please complete the security check before submitting.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", params.token.trim());
    if (params.remoteip) {
      formData.append("remoteip", params.remoteip);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[Turnstile HTTP Error]: Verification endpoint returned status ${response.status}`);
      return {
        success: false,
        error: "Unable to verify security challenge. Please try again.",
      };
    }

    const data = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
      challenge_ts?: string;
      hostname?: string;
      action?: string;
      cdata?: string;
    };

    if (data.success) {
      return {
        success: true,
        hostname: data.hostname,
      };
    }

    // Handle failure error codes safely without logging secrets or raw tokens
    const errorCodes = data["error-codes"] || [];
    console.warn(`[Turnstile Verification Failed]: Error codes: ${errorCodes.join(", ") || "none"}`);

    let userFacingMessage = "Security verification failed. Please try again.";
    if (errorCodes.includes("timeout-or-duplicate")) {
      userFacingMessage = "Security check expired or was already used. Please complete the verification again.";
    } else if (errorCodes.includes("invalid-input-response") || errorCodes.includes("missing-input-response")) {
      userFacingMessage = "Invalid security check token. Please complete the verification again.";
    }

    return {
      success: false,
      error: userFacingMessage,
      errorCodes,
    };
  } catch (error) {
    console.error("[Turnstile Network Error]: Failed to reach Cloudflare Siteverify API:", error);
    return {
      success: false,
      error: "Security verification service unreachable. Please check your internet connection.",
    };
  }
}

