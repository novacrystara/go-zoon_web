import { getSupabaseServerClient } from "./supabase-server";

export interface WaitlistMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  message: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertWaitlistMemberParams {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  message?: string;
}

export interface UpsertWaitlistResult {
  member: WaitlistMember;
  count: number;
}

/**
 * Return the exact live count of unique registered waitlist members.
 * Counts all rows in public.waitlist_members (where email has a unique constraint).
 * Throws on database failure so callers never receive a misleading count of 0.
 */
export async function getWaitlistCount(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("waitlist_members")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(
      "[Waitlist DB Error]: Failed to fetch waitlist members count:",
      error.message
    );
    throw new Error(`Failed to query waitlist count: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Alias for getWaitlistCount to maintain backwards compatibility.
 */
export const getTotalWaitlistCount = getWaitlistCount;

/**
 * Return verified-only count (for admin/reporting if needed).
 */
export async function getVerifiedWaitlistCount(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("waitlist_members")
    .select("*", { count: "exact", head: true })
    .eq("verified", true);

  if (error) {
    console.error(
      "[Waitlist DB Error]: Failed to fetch verified members count:",
      error.message
    );
    throw new Error(`Failed to query verified count: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Perform an atomic upsert on public.waitlist_members with email as conflict target:
 * - Normalizes email to trimmed lowercase.
 * - On insert: Postgres generates id, sets created_at to now(), and verified to false.
 * - On update (conflict on email): Updates full_name, phone, role, message, and updated_at.
 * - Preserves existing created_at and verified state on conflict.
 * - Returns the updated member record and the fresh count of unique members from Supabase.
 */
export async function upsertWaitlistMember(
  params: UpsertWaitlistMemberParams
): Promise<UpsertWaitlistResult> {
  const normalizedEmail = (params.email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("A valid email address is required for waitlist registration.");
  }

  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("waitlist_members")
    .upsert(
      {
        full_name: params.fullName.trim(),
        email: normalizedEmail,
        phone: params.phone?.trim() || null,
        role: params.role.trim(),
        message: params.message?.trim() || null,
        updated_at: nowIso,
      },
      {
        onConflict: "email",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error || !data) {
    console.error(
      "[Waitlist DB Error]: Failed to upsert waitlist member:",
      error?.message || "Unknown error"
    );
    throw new Error("Unable to save waitlist submission. Please try again.");
  }

  // Fetch the fresh total count of unique registered members directly from Supabase
  const freshCount = await getWaitlistCount();

  return {
    member: data as WaitlistMember,
    count: freshCount,
  };
}
