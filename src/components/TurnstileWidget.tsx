"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import Script from "next/script";

export interface TurnstileWidgetHandle {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (errorCode?: string) => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
          action?: string;
          cData?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      ready: (callback: () => void) => void;
    };
  }
}

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  ({ onSuccess, onExpire, onError, className = "" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    // Keep callbacks in refs to prevent unnecessary effect re-runs or re-renders
    const callbacksRef = useRef({ onSuccess, onExpire, onError });
    callbacksRef.current = { onSuccess, onExpire, onError };

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

    // Imperative handle for parent to reset the Turnstile challenge
    useImperativeHandle(ref, () => ({
      reset: () => {
        if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (err) {
            console.warn("[Turnstile Widget]: Error resetting challenge:", err);
          }
        }
      },
    }));

    useEffect(() => {
      let isMounted = true;
      let intervalId: NodeJS.Timeout | null = null;

      const tryRender = (): boolean => {
        if (!isMounted || !containerRef.current || widgetIdRef.current || !siteKey) {
          return true;
        }

        if (
          typeof window !== "undefined" &&
          window.turnstile &&
          typeof window.turnstile.render === "function"
        ) {
          try {
            containerRef.current.innerHTML = "";
            const id = window.turnstile.render(containerRef.current, {
              sitekey: siteKey,
              theme: "light",
              size: "normal",
              callback: (token: string) => {
                callbacksRef.current.onSuccess(token);
              },
              "expired-callback": () => {
                callbacksRef.current.onExpire?.();
              },
              "error-callback": (errorCode?: string) => {
                callbacksRef.current.onError?.(errorCode);
              },
            });
            widgetIdRef.current = id;
            return true;
          } catch (err) {
            console.warn("[Turnstile Widget]: Failed to render Turnstile:", err);
          }
        }

        return false;
      };

      // Try rendering immediately if already loaded
      if (!tryRender()) {
        let attempts = 0;
        intervalId = setInterval(() => {
          attempts++;
          if (tryRender() || attempts > 50) {
            if (intervalId) clearInterval(intervalId);
          }
        }, 100);
      }

      return () => {
        isMounted = false;
        if (intervalId) clearInterval(intervalId);
        if (widgetIdRef.current && typeof window !== "undefined" && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore cleanup errors
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey]);

    if (!siteKey) {
      return (
        <div className="text-center text-[12px] text-amber-600 my-[8px]">
          Security check key is not configured.
        </div>
      );
    }

    return (
      <div className={`turnstile-wrapper my-[14px] min-h-[65px] flex justify-center ${className}`}>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onLoad={() => {
            if (
              typeof window !== "undefined" &&
              window.turnstile &&
              containerRef.current &&
              !widgetIdRef.current
            ) {
              try {
                containerRef.current.innerHTML = "";
                const id = window.turnstile.render(containerRef.current, {
                  sitekey: siteKey,
                  theme: "light",
                  size: "normal",
                  callback: (token: string) => {
                    callbacksRef.current.onSuccess(token);
                  },
                  "expired-callback": () => {
                    callbacksRef.current.onExpire?.();
                  },
                  "error-callback": (errorCode?: string) => {
                    callbacksRef.current.onError?.(errorCode);
                  },
                });
                widgetIdRef.current = id;
              } catch (e) {
                console.warn("[Turnstile Script onLoad Error]:", e);
              }
            }
          }}
          onError={() => {
            callbacksRef.current.onError?.(
              "Failed to load security verification script. Please check your connection."
            );
          }}
        />
        <div ref={containerRef} className="w-full flex justify-center" />
      </div>
    );
  }
);

TurnstileWidget.displayName = "TurnstileWidget";

export default TurnstileWidget;
