/**
 * Input sanitization and validation utilities for contact/waitlist form.
 */

export interface ContactFormData {
  role: string;
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  website?: string; // Honeypot field
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitizedData?: {
    role: string;
    fullName: string;
    email: string;
    phone: string;
    message: string;
  };
}

/**
 * Escape HTML characters to prevent XSS / HTML injection in email templates.
 */
export function escapeHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Standard email format validator (RFC 5322 compatible regex).
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email);
}

/**
 * Validate and sanitize form input fields.
 */
export function validateContactForm(data: unknown): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: { form: "Invalid request payload. Expected JSON object." },
    };
  }

  const payload = data as Partial<ContactFormData>;

  // Honeypot check (website/hidden field must remain empty)
  if (payload.website && payload.website.trim().length > 0) {
    // Return invalid silently or handled as spam
    return {
      valid: false,
      errors: { bot: "Spam detected." },
    };
  }

  // Validate Role
  const rawRole = typeof payload.role === "string" ? payload.role.trim() : "";
  if (!rawRole) {
    errors.role = "Please select your role.";
  } else if (rawRole.length > 50) {
    errors.role = "Role cannot exceed 50 characters.";
  }

  // Validate Full Name
  const rawFullName = typeof payload.fullName === "string" ? payload.fullName.trim() : "";
  if (!rawFullName) {
    errors.fullName = "Full name is required.";
  } else if (rawFullName.length < 2) {
    errors.fullName = "Full name must be at least 2 characters.";
  } else if (rawFullName.length > 100) {
    errors.fullName = "Full name cannot exceed 100 characters.";
  }

  // Validate Email
  const rawEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!rawEmail) {
    errors.email = "Email address is required.";
  } else if (!isValidEmail(rawEmail)) {
    errors.email = "Please provide a valid email address.";
  }

  // Validate Phone (optional)
  const rawPhone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  if (rawPhone && rawPhone.length > 30) {
    errors.phone = "Phone number cannot exceed 30 characters.";
  } else if (rawPhone && !/^[0-9+\s\-().]{5,30}$/.test(rawPhone)) {
    errors.phone = "Please enter a valid phone number.";
  }

  // Validate Message (optional)
  const rawMessage = typeof payload.message === "string" ? payload.message.trim() : "";
  if (rawMessage.length > 2000) {
    errors.message = "Message cannot exceed 2000 characters.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitizedData: {
      role: rawRole,
      fullName: rawFullName,
      email: rawEmail,
      phone: rawPhone,
      message: rawMessage,
    },
  };
}

