/**
 * Migration Script: Migrate existing filesystem waitlist submissions to Supabase PostgreSQL.
 *
 * Steps:
 * 1. Safely creates a timestamped backup of data/waitlist.json.
 * 2. Deduplicates submissions by normalized lowercase email.
 * 3. Preserves the earliest submission timestamp as `created_at` and latest as `updated_at`.
 * 4. Upserts member records into `public.waitlist_members` on Supabase.
 * 5. Leaves the backup and existing files intact.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DATA_FILE = path.join(projectRoot, "data", "waitlist.json");
const ENV_FILE = path.join(projectRoot, ".env.local");

// Parse .env.local manually for standalone ESM script execution
function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    throw new Error(`.env.local not found at ${ENV_FILE}`);
  }

  const content = fs.readFileSync(ENV_FILE, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1].trim()] = val;
    }
  }
  return env;
}

async function migrate() {
  console.log("=== Go-Zoon Waitlist Migration to Supabase ===");

  if (!fs.existsSync(DATA_FILE)) {
    console.log(`[Info] No filesystem waitlist file found at ${DATA_FILE}. Nothing to migrate.`);
    return;
  }

  // 1. Read JSON file
  const rawData = fs.readFileSync(DATA_FILE, "utf-8");
  let submissions = [];
  try {
    submissions = JSON.parse(rawData);
    if (!Array.isArray(submissions)) {
      console.error("[Error] data/waitlist.json does not contain an array.");
      return;
    }
  } catch (err) {
    console.error("[Error] Failed to parse data/waitlist.json:", err.message);
    return;
  }

  console.log(`[1/4] Found ${submissions.length} total filesystem submissions.`);

  // 2. Create timestamped backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(projectRoot, "data", `waitlist.backup.${timestamp}.json`);
  fs.writeFileSync(backupPath, rawData, "utf-8");
  console.log(`[2/4] Safe backup created at: ${backupPath}`);

  // 3. Deduplicate and group by normalized email
  const membersByEmail = new Map();

  for (const item of submissions) {
    const email = (item.email || "").trim().toLowerCase();
    if (!email) continue;

    const submittedAt = item.submittedAt ? new Date(item.submittedAt).toISOString() : new Date().toISOString();

    if (!membersByEmail.has(email)) {
      membersByEmail.set(email, {
        full_name: (item.fullName || "").trim() || "Anonymous Member",
        email,
        phone: (item.phone || "").trim() || null,
        role: (item.role || "Customer").trim(),
        message: (item.message || "").trim() || null,
        verified: false,
        created_at: submittedAt,
        updated_at: submittedAt,
        allDates: [submittedAt],
      });
    } else {
      const existing = membersByEmail.get(email);
      existing.allDates.push(submittedAt);
      // Keep most recently submitted details if available
      if (item.fullName) existing.full_name = item.fullName.trim();
      if (item.phone) existing.phone = item.phone.trim();
      if (item.role) existing.role = item.role.trim();
      if (item.message) existing.message = item.message.trim();
    }
  }

  // Compute earliest created_at and latest updated_at
  const uniqueMembers = Array.from(membersByEmail.values()).map((member) => {
    const sorted = member.allDates.slice().sort();
    return {
      full_name: member.full_name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      message: member.message,
      verified: member.verified,
      created_at: sorted[0],
      updated_at: sorted[sorted.length - 1],
    };
  });

  console.log(`[3/4] Deduplicated to ${uniqueMembers.length} unique members.`);

  // 4. Connect to Supabase
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`[4/4] Upserting ${uniqueMembers.length} records into public.waitlist_members...`);

  let successCount = 0;
  for (const member of uniqueMembers) {
    const { error } = await supabase.from("waitlist_members").upsert(
      {
        full_name: member.full_name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        message: member.message,
        verified: member.verified,
        created_at: member.created_at,
        updated_at: member.updated_at,
      },
      { onConflict: "email" }
    );

    if (error) {
      console.error(`  ✕ Failed to migrate ${member.email}:`, error.message);
    } else {
      console.log(`  ✓ Migrated: ${member.email} (${member.role})`);
      successCount++;
    }
  }

  // Fetch final statistics from Supabase
  const { count: totalCount } = await supabase
    .from("waitlist_members")
    .select("*", { count: "exact", head: true });

  const { count: verifiedCount } = await supabase
    .from("waitlist_members")
    .select("*", { count: "exact", head: true })
    .eq("verified", true);

  console.log("\n=============================================");
  console.log("Migration Summary:");
  console.log(`- Total submissions in backup file: ${submissions.length}`);
  console.log(`- Unique members upserted successfully: ${successCount} / ${uniqueMembers.length}`);
  console.log(`- Supabase waitlist_members total count: ${totalCount}`);
  console.log(`- Supabase waitlist_members verified count: ${verifiedCount}`);
  console.log(`- Safe backup file preserved at: ${backupPath}`);
  console.log("=============================================\n");
}

migrate().catch((err) => {
  console.error("Migration failed with unhandled exception:", err);
  process.exit(1);
});

