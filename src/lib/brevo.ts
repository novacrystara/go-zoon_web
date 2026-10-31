import { escapeHtml } from "./validators";

export interface SendEmailParams {
  role: string;
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
}

export interface BrevoSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Send transactional email notification via Brevo API.
 */
export async function sendWaitlistNotificationEmail(
  params: SendEmailParams
): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const ownerEmail = process.env.OWNER_EMAIL?.trim();
  const mockEmail = process.env.MOCK_EMAIL === "true" || !apiKey || apiKey.startsWith("your_");

  // Mock mode for local testing without active Brevo credentials
  if (mockEmail) {
    const mockId = `<mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@go-zoon.local>`;
    console.log(
      `[Brevo Email Mock] Simulated notification delivery for "${params.fullName}" (${params.email}) to "${ownerEmail || "owner@example.com"}". Mock ID: ${mockId}`
    );
    return {
      success: true,
      messageId: mockId,
    };
  }

  // Validate required configuration
  if (!apiKey) {
    console.error("[Brevo Configuration Error]: BREVO_API_KEY is not defined.");
    return {
      success: false,
      error: "Email delivery service is misconfigured on the server (missing API key).",
    };
  }

  if (!senderEmail || !ownerEmail) {
    console.error(
      "[Brevo Configuration Error]: BREVO_SENDER_EMAIL or OWNER_EMAIL is not defined."
    );
    return {
      success: false,
      error: "Email delivery service is misconfigured on the server (missing sender/owner email).",
    };
  }

  const safeFullName = escapeHtml(params.fullName);
  const safeRole = escapeHtml(params.role);
  const safeEmail = escapeHtml(params.email);
  const safePhone = params.phone ? escapeHtml(params.phone) : "Not provided";
  const safeMessage = params.message ? escapeHtml(params.message) : "No message provided";
  const submissionDate = new Date().toUTCString();

  const subject = `New Waitlist Submission - ${params.fullName} (${params.role})`;

  // Plain-text content fallback
  const textContent = `
NEW WAITLIST / CONTACT SUBMISSION - GO-ZOON

Role: ${params.role}
Full Name: ${params.fullName}
Email Address: ${params.email}
Phone Number: ${params.phone || "Not provided"}
Submitted At: ${submissionDate}

Message:
${params.message || "No message provided"}

--------------------------------------------------
To reply to this inquiry, reply directly to this email.
Sent automatically from the GO-ZOON website.
`.trim();

  // Branded HTML content
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #15233d;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fb; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color: #003cbd; padding: 24px 30px; text-align: left;">
              <span style="display: inline-block; font-size: 20px; font-weight: 900; letter-spacing: 0.05em; color: #ffffff;">
                GO-ZOON
              </span>
              <span style="display: block; font-size: 13px; font-weight: 600; color: #c4d7ff; margin-top: 4px;">
                New Waitlist Submission Received
              </span>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #15233d;">
                Waitlist Registration Details
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #4b5d78;">
                A new visitor has submitted the waitlist form on the GO-ZOON website. Details are provided below:
              </p>

              <!-- Details Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px; border-collapse: collapse; border: 1px solid #e5edf8; border-radius: 8px;">
                <tr style="background-color: #f8fbff; border-bottom: 1px solid #e5edf8;">
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #30425f; width: 140px;">Role / Category</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 800; color: #ff4a14;">${safeRole}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5edf8;">
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #30425f;">Full Name</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #15233d;">${safeFullName}</td>
                </tr>
                <tr style="background-color: #f8fbff; border-bottom: 1px solid #e5edf8;">
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #30425f;">Email Address</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #003cbd;">
                    <a href="mailto:${safeEmail}" style="color: #003cbd; text-decoration: underline;">${safeEmail}</a>
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #e5edf8;">
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #30425f;">Phone Number</td>
                  <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #15233d;">${safePhone}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; color: #30425f;">Timestamp (UTC)</td>
                  <td style="padding: 12px 16px; font-size: 13px; color: #5c6a86;">${submissionDate}</td>
                </tr>
              </table>

              <!-- Message Section -->
              <div style="background-color: #fdfdfd; border: 1px solid #e5edf8; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #5c6a86; letter-spacing: 0.05em;">
                  Message / Comments
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #15233d; white-space: pre-wrap;">${safeMessage}</p>
              </div>

              <!-- Action Callout -->
              <p style="margin: 0; font-size: 13px; color: #5c6a86; line-height: 1.4;">
                💡 <strong>Reply-To:</strong> You can click "Reply" in your email client to respond directly to ${safeFullName} (${safeEmail}).
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fbff; border-top: 1px solid #e5edf8; padding: 16px 30px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #7f90ab;">
                This notification was generated automatically by the GO-ZOON Website Brevo Email Service.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  const payload = {
    sender: {
      name: "GO-ZOON Website",
      email: senderEmail,
    },
    to: [
      {
        email: ownerEmail,
        name: "GO-ZOON Admin",
      },
    ],
    replyTo: {
      email: params.email,
      name: params.fullName,
    },
    subject,
    htmlContent,
    textContent,
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (response.status === 201 && data?.messageId) {
      return {
        success: true,
        messageId: data.messageId,
      };
    }

    // Brevo API error handling
    console.error(
      `[Brevo API Error]: HTTP ${response.status} - Code: ${data?.code || "unknown"} - Message: ${data?.message || "No error details"}`
    );

    let clientMessage = "Unable to deliver email notification at this moment.";
    if (response.status === 401) {
      if (data?.message?.includes("unrecognised IP address") || data?.message?.includes("authorised_ips")) {
        clientMessage = "Brevo requires IP authorization. Please authorize your current IP at https://app.brevo.com/security/authorised_ips.";
      } else {
        clientMessage = "Email service authentication failed. Please verify your Brevo API key.";
      }
    } else if (response.status === 400 && data?.message?.includes("sender")) {
      clientMessage = "The sender email is not verified in Brevo. Please verify it in Brevo sender settings.";
    }

    return {
      success: false,
      error: clientMessage,
      statusCode: response.status,
    };
  } catch (error) {
    console.error("[Brevo Network Error]: Failed to contact Brevo API endpoint:", error);
    return {
      success: false,
      error: "Network error occurred while connecting to email service.",
      statusCode: 502,
    };
  }
}

