"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { broadcastWaitlistCount } from "@/hooks/useWaitlistCount";
import WaitlistLiveBadge from "./WaitlistLiveBadge";
import TurnstileWidget, { TurnstileWidgetHandle } from "./TurnstileWidget";

export default function Contact() {
  const { ref: sectionRef, isVisible } = useScrollReveal();
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot field for spam bots
  const [turnstileToken, setTurnstileToken] = useState(""); // Cloudflare Turnstile token

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "We will contact you soon!",
  });

  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  useEffect(() => {
    // Listen for clicks on anything with data-role to update the select
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const elementWithRole = target.closest("[data-role]") as HTMLElement;

      if (elementWithRole && elementWithRole.dataset.role) {
        setRole(elementWithRole.dataset.role);
        // Scroll form smoothly into view on mobile if needed
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    if (!role) {
      setStatus({
        type: "error",
        message: "Please select your role from the dropdown.",
      });
      return;
    }

    if (!turnstileToken) {
      setStatus({
        type: "error",
        message: "Please complete the security check before submitting.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      type: "idle",
      message: "Sending your details...",
    });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          fullName,
          email,
          phone,
          message,
          website, // Honeypot
          turnstileToken, // Cloudflare Turnstile Token
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        // Broadcast the updated count live across the whole page
        if (typeof data.count === "number") {
          broadcastWaitlistCount(data.count);
        }

        setStatus({
          type: "success",
          message: data.message || "✓ Thanks! You've joined the waitlist. We will contact you soon!",
        });

        // Reset form inputs only after successful submission
        setRole("");
        setFullName("");
        setEmail("");
        setPhone("");
        setMessage("");
        setWebsite("");
      } else {
        const errorMsg =
          (data?.errors ? (Object.values(data.errors)[0] as string) : null) ||
          data?.error ||
          "Failed to submit. Please check your information and try again.";
        setStatus({
          type: "error",
          message: errorMsg,
        });
      }
    } catch (err) {
      console.error("[Contact Form Submission Error]:", err);
      setStatus({
        type: "error",
        message: "Network error occurred. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
      // Reset the Turnstile widget after every attempt so user can retry
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement | null>}
      id="contact"
      className={`contact section relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] min-h-[500px] grid grid-cols-1 min-[1121px]:grid-cols-[430px_1fr] gap-[40px] items-center pt-[54px] md:pt-[76px] pb-[54px] md:pb-[72px] bg-gradient-to-b from-white to-[#f3f8ff] reveal-up ${isVisible ? "reveal-visible" : ""}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />

      <div className="contact-copy max-w-full md:max-w-none">
        <p className="eyebrow orange mb-[20px] text-brand-orange text-[17px] font-black tracking-[0.055em] uppercase after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:rounded-full after:bg-brand-orange">
          Get Involved
        </p>
        <h2 className="mb-[14px] text-[#15233d] text-[34px] leading-[1.08] font-black">
          Let&apos;s Build the Future of Delivery — <span className="text-brand-orange">Together.</span>
        </h2>
        <p className="text-[#30425f] text-[18px] leading-[1.45] font-bold">
          Join the GO-ZOON waitlist and be part of something fair, transparent and built for everyone.
        </p>

        {/* Live Waitlist Members Badge in Contact Section */}
        <WaitlistLiveBadge variant="contact" />

        <div className="role-cards grid grid-cols-2 md:grid-cols-4 gap-[14px] mt-[16px]">
          <button
            type="button"
            data-role="Investor"
            onClick={() => setRole("Investor")}
            className="flex flex-col items-center justify-center min-h-[150px] p-[15px_10px] border-none rounded-[10px] bg-white text-[#1d2e4d] shadow-[0_10px_24px_rgba(11,44,108,0.10)] cursor-pointer hover:-translate-y-[4px] hover:shadow-[0_15px_30px_rgba(11,44,108,0.15)] transition-all duration-300 will-change-transform"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#073db7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-[10px]">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span className="font-black text-[13px] md:text-[14px] mb-[4px] text-[#1d2e4d] text-center">For<br/>Investors</span>
            <span className="text-[11px] md:text-[12px] font-[600] text-[#5c6a86] leading-[1.3] text-center">Business &amp; partnership<br/>opportunities</span>
          </button>
          
          <button
            type="button"
            data-role="Restaurant Owner"
            onClick={() => setRole("Restaurant Owner")}
            className="flex flex-col items-center justify-center min-h-[150px] p-[15px_10px] border-none rounded-[10px] bg-white text-[#1d2e4d] shadow-[0_10px_24px_rgba(11,44,108,0.10)] cursor-pointer hover:-translate-y-[4px] hover:shadow-[0_15px_30px_rgba(11,44,108,0.15)] transition-all duration-300 will-change-transform"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-[10px]">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"></path>
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"></path>
              <path d="M12 3v6"></path>
            </svg>
            <span className="font-black text-[13px] md:text-[14px] mb-[4px] text-[#1d2e4d] text-center">For<br/>Restaurants</span>
            <span className="text-[11px] md:text-[12px] font-[600] text-[#5c6a86] leading-[1.3] text-center">Register your<br/>restaurant&apos;s interest</span>
          </button>
          
          <button
            type="button"
            data-role="Customer"
            onClick={() => setRole("Customer")}
            className="flex flex-col items-center justify-center min-h-[150px] p-[15px_10px] border-none rounded-[10px] bg-white text-[#1d2e4d] shadow-[0_10px_24px_rgba(11,44,108,0.10)] cursor-pointer hover:-translate-y-[4px] hover:shadow-[0_15px_30px_rgba(11,44,108,0.15)] transition-all duration-300 will-change-transform"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#17233d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-[10px]">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="font-black text-[13px] md:text-[14px] mb-[4px] text-[#1d2e4d] text-center">For<br/>Customers</span>
            <span className="text-[11px] md:text-[12px] font-[600] text-[#5c6a86] leading-[1.3] text-center">Get notified<br/>when we launch</span>
          </button>
          
          <button
            type="button"
            data-role="Rider"
            onClick={() => setRole("Rider")}
            className="flex flex-col items-center justify-center min-h-[150px] p-[15px_10px] border-none rounded-[10px] bg-white text-[#1d2e4d] shadow-[0_10px_24px_rgba(11,44,108,0.10)] cursor-pointer hover:-translate-y-[4px] hover:shadow-[0_15px_30px_rgba(11,44,108,0.15)] transition-all duration-300 will-change-transform"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-[10px]">
              <circle cx="5.5" cy="17.5" r="3.5"></circle>
              <circle cx="18.5" cy="17.5" r="3.5"></circle>
              <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"></path>
            </svg>
            <span className="font-black text-[13px] md:text-[14px] mb-[4px] text-[#1d2e4d] text-center">For<br/>Riders</span>
            <span className="text-[11px] md:text-[12px] font-[600] text-[#5c6a86] leading-[1.3] text-center">Apply to<br/>become a Road-King</span>
          </button>
        </div>
      </div>

      <div className="form-wrap grid grid-cols-1 min-[1121px]:grid-cols-[minmax(430px,1fr)_220px] items-stretch rounded-[20px] overflow-hidden shadow-[0_18px_45px_rgba(1,39,113,0.16)] bg-white">
        <form ref={formRef} className="waitlist-form p-[26px_34px_18px]" noValidate onSubmit={handleSubmit}>
          
          {/* Form Header with Live Count Badge */}
          <div className="flex flex-wrap items-center justify-between gap-[10px] mb-[18px]">
            <h2 className="text-[#15233d] text-[27px] font-black m-0">Join the Waitlist</h2>
            <WaitlistLiveBadge variant="form-header" />
          </div>

          {/* Hidden honeypot field for anti-spam */}
          <div aria-hidden="true" style={{ display: "none" }}>
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className="field-grid grid grid-cols-1 md:grid-cols-2 gap-y-[16px] gap-x-[22px]">
            <label className="grid gap-[7px] text-[#3a4864] text-[12px] font-[850]">
              <span>I am a <b className="text-brand-orange">*</b></span>
              <select
                id="role"
                required
                className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Select your role</option>
                <option value="Investor">Investor</option>
                <option value="Restaurant Owner">Restaurant Owner</option>
                <option value="Customer">Customer</option>
                <option value="Rider">Rider</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="grid gap-[7px] text-[#3a4864] text-[12px] font-[850]">
              <span>Full Name <b className="text-brand-orange">*</b></span>
              <input
                type="text"
                required
                placeholder="Your full name"
                className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                maxLength={100}
              />
            </label>
            <label className="grid gap-[7px] text-[#3a4864] text-[12px] font-[850]">
              <span>Email Address <b className="text-brand-orange">*</b></span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                maxLength={254}
              />
            </label>
            <label className="grid gap-[7px] text-[#3a4864] text-[12px] font-[850]">
              <span>Phone Number</span>
              <input
                type="tel"
                placeholder="07XXXXXXXXX"
                className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
                maxLength={30}
              />
            </label>
          </div>

          <label className="grid gap-[7px] mt-[16px] text-[#3a4864] text-[12px] font-[850]">
            <span>Message (Optional)</span>
            <textarea
              rows={4}
              placeholder="Tell us how you'd like to be involved..."
              className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              maxLength={2000}
            />
          </label>

          {/* Cloudflare Turnstile CAPTCHA Widget directly above the Send button */}
          <TurnstileWidget
            ref={turnstileRef}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setStatus((prev) =>
                prev.type === "error" && prev.message.includes("security")
                  ? { type: "idle", message: "We will contact you soon!" }
                  : prev
              );
            }}
            onExpire={() => {
              setTurnstileToken("");
              setStatus({
                type: "error",
                message: "Security check expired. Please complete the verification again.",
              });
            }}
            onError={() => {
              setTurnstileToken("");
              setStatus({
                type: "error",
                message: "Security check could not load. Please check your internet connection.",
              });
            }}
          />

          <button
            className={`submit w-full mt-[10px] min-h-[48px] border-none rounded-full font-heading font-black text-[14px] leading-none text-white bg-gradient-to-br from-brand-orange to-[#ff6d09] shadow-[0_12px_24px_rgba(255,74,20,0.22)] cursor-pointer hover:shadow-[0_12px_28px_rgba(255,74,20,0.35),0_0_20px_rgba(255,74,20,0.15)] hover:scale-104 active:scale-98 transition-all duration-300 ease-out flex items-center justify-center gap-[8px] ${
              isSubmitting ? "opacity-75 cursor-not-allowed hover:scale-100" : ""
            }`}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <span>➤ Send</span>
            )}
          </button>

          <p
            className={`form-note mt-[9px] mb-0 text-center text-[12px] font-[800] transition-colors duration-300 ${
              status.type === "success"
                ? "text-emerald-600 font-black"
                : status.type === "error"
                ? "text-rose-600 font-black"
                : "text-[#3a4864]"
            }`}
            aria-live="polite"
          >
            {status.message}
          </p>
        </form>

        <div className="relative hidden min-[1121px]:block w-full h-full">
          <Image
            src="/assets/contact-visual.png"
            alt="Business meeting about GO-ZOON"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
