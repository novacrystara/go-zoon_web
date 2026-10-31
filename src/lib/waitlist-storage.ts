import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface WaitlistSubmission {
  id: string;
  submittedAt: string;
  role: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  ip?: string;
  userAgent?: string;
}

export interface StoreSubmissionResult {
  submission: WaitlistSubmission;
  count: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(process.cwd(), "data", "waitlist.json");
const STATS_FILE = path.join(process.cwd(), "data", "waitlist-stats.json");

/**
 * Get current waitlist count from stored submissions.
 */
export async function getWaitlistCount(): Promise<number> {
  try {
    const content = await fs.readFile(STORAGE_FILE, "utf-8");
    const existing = JSON.parse(content);
    if (Array.isArray(existing)) {
      return existing.length;
    }
  } catch {
    // If file does not exist, check stats file or return 0
    try {
      const statsContent = await fs.readFile(STATS_FILE, "utf-8");
      const stats = JSON.parse(statsContent);
      if (typeof stats.totalCount === "number") {
        return stats.totalCount;
      }
    } catch {
      // fresh start
    }
  }
  return 0;
}

/**
 * Persist waitlist submission to local JSON store and update total count.
 */
export async function storeWaitlistSubmission(data: {
  role: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  ip?: string;
  userAgent?: string;
}): Promise<StoreSubmissionResult> {
  const submission: WaitlistSubmission = {
    id: crypto.randomUUID ? crypto.randomUUID() : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    submittedAt: new Date().toISOString(),
    role: data.role,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    message: data.message,
    ip: data.ip ? data.ip.replace(/:\d+$/, "") : undefined,
    userAgent: data.userAgent,
  };

  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    let existing: WaitlistSubmission[] = [];
    try {
      const content = await fs.readFile(STORAGE_FILE, "utf-8");
      existing = JSON.parse(content);
      if (!Array.isArray(existing)) {
        existing = [];
      }
    } catch {
      // File does not exist yet or empty; start fresh array
      existing = [];
    }

    // Append new submission
    existing.push(submission);
    const newCount = existing.length;

    // Write waitlist array safely
    const tempFile = `${STORAGE_FILE}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(existing, null, 2), "utf-8");
    await fs.rename(tempFile, STORAGE_FILE);

    // Write stats file for rapid count retrieval
    try {
      const statsTemp = `${STATS_FILE}.tmp.${Date.now()}`;
      await fs.writeFile(
        statsTemp,
        JSON.stringify({ totalCount: newCount, lastUpdated: new Date().toISOString() }, null, 2),
        "utf-8"
      );
      await fs.rename(statsTemp, STATS_FILE);
    } catch {
      // Best-effort stats file
    }

    return { submission, count: newCount };
  } catch (error) {
    console.error("[Waitlist Storage Error]: Failed to persist waitlist submission to file:", error);
    const fallbackCount = await getWaitlistCount();
    return { submission, count: fallbackCount };
  }
}
