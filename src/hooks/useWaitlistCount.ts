"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Dispatch custom event to notify all components on the page when the count updates locally.
 */
export function broadcastWaitlistCount(count: number) {
  if (typeof window !== "undefined" && typeof count === "number") {
    window.dispatchEvent(
      new CustomEvent("waitlist:countUpdated", { detail: { count } })
    );
  }
}

/**
 * Hook to manage live waitlist count from Supabase.
 * - Queries /api/waitlist/count on mount.
 * - Re-polls periodically (every 15s) and on tab visibility/focus.
 * - Listens for local form submission broadcasts for immediate zero-latency UI updates.
 * - Handles errors gracefully: never replaces valid counts with 0 on network/API failure.
 */
export function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      // Primary server-side endpoint connected to Supabase
      const res = await fetch("/api/waitlist/count", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch waitlist count`);
      }

      const data = await res.json();
      if (data && data.success && typeof data.count === "number") {
        setCount(data.count);
        setError(null);
      } else {
        throw new Error("Invalid count response payload");
      }
    } catch (err) {
      console.warn("[Waitlist Count Error]:", err);
      setError("Failed to fetch live waitlist count.");
      // Do NOT overwrite existing count with 0 on network/API errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    // 1. Initial fetch on mount
    const initFetch = async () => {
      if (isSubscribed) {
        await fetchCount();
      }
    };
    initFetch();

    // 2. Immediate local sync on custom event broadcast (e.g. after form submission)
    const handleCountUpdated = (event: Event) => {
      if (!isSubscribed) return;
      const customEvent = event as CustomEvent<{ count: number }>;
      if (typeof customEvent.detail?.count === "number") {
        setCount(customEvent.detail.count);
        setError(null);
        setIsLoading(false);
      } else {
        fetchCount();
      }
    };
    window.addEventListener("waitlist:countUpdated", handleCountUpdated);

    // 3. Re-sync immediately when user refocuses the browser window or returns to the tab
    const handleVisibilityChange = () => {
      if (isSubscribed && typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchCount();
      }
    };
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Background polling strategy: sync every 15s when tab is active
    const interval = setInterval(() => {
      if (isSubscribed && typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchCount();
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      window.removeEventListener("waitlist:countUpdated", handleCountUpdated);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchCount]);

  return {
    count,
    isLoading: isLoading && count === null,
    error,
    refreshCount: fetchCount,
  };
}
