"use client";

import Image from "next/image";
import { useWaitlistCount } from "@/hooks/useWaitlistCount";

interface WaitlistLiveBadgeProps {
  variant?: "hero" | "contact" | "form-header" | "compact";
  className?: string;
}

/**
 * Reusable animated Go-Zoon delivery bike layer with dynamic speed trails and road track.
 */
function BikeAnimationLayer() {
  return (
    <>
      {/* 1. Subtle speed road along the pill floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#0755E8]/25 via-[#FF7900]/30 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Continuous Delivery Bike & Dynamic Motion Trails */}
      <div
        className="delivery-runner absolute bottom-[2px] flex items-center pointer-events-none z-[2]"
        aria-hidden="true"
      >
        {/* Dynamic Motion Trails (streaks extending behind the bike) */}
        <div className="relative flex flex-col gap-[2.5px] items-end pr-[2px]">
          {/* Top orange streak */}
          <div className="h-[1.5px] w-[65px] bg-gradient-to-r from-transparent via-[#FF7900]/60 to-[#FF7900] rounded-full animate-trail-flicker" />

          {/* Mid-top electric blue streak */}
          <div className="h-[2px] w-[105px] bg-gradient-to-r from-transparent via-[#0755E8]/65 to-[#0755E8] rounded-full shadow-[0_0_6px_rgba(7,85,232,0.4)]" />

          {/* Core brand orange streak */}
          <div className="h-[2.5px] w-[135px] bg-gradient-to-r from-transparent via-[#FF7900]/80 to-[#FF7900] rounded-full shadow-[0_0_6px_rgba(255,121,0,0.5)] animate-trail-flicker" />

          {/* Mid-lower electric blue streak */}
          <div className="h-[1.5px] w-[90px] bg-gradient-to-r from-transparent via-[#0755E8]/60 to-[#0755E8] rounded-full" />

          {/* Lower warm orange streak near wheel */}
          <div className="h-[1.5px] w-[55px] bg-gradient-to-r from-transparent via-[#FF9433]/70 to-[#FF9433] rounded-full" />

          {/* Ambient luminous trail wake */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[140px] h-[22px] bg-gradient-to-r from-transparent via-[#FF7900]/12 to-[#0755E8]/18 rounded-full blur-[4px]" />
        </div>

        {/* Go-Zoon Delivery Rider with subtle suspension bounce */}
        <div className="animate-bike-bounce relative w-[46px] h-[31px] shrink-0">
          <Image
            src="/assets/futuristic-gozoon-bike.png"
            alt="Go-Zoon Delivery Rider"
            width={69}
            height={46}
            className="w-full h-full object-contain select-none filter drop-shadow-[0_2px_5px_rgba(6,26,58,0.22)]"
            priority
            unoptimized
          />
        </div>
      </div>
    </>
  );
}

export default function WaitlistLiveBadge({
  variant = "hero",
  className = "",
}: WaitlistLiveBadgeProps) {
  const { count, isLoading } = useWaitlistCount();

  const displayCount = isLoading || count === null ? "..." : count;
  const isSingular = count === 1;

  if (variant === "form-header") {
    return (
      <div
        className={`inline-flex items-center gap-[6px] bg-[#fff4ee] border border-[#ffcfb5] text-brand-orange px-[11px] py-[3.5px] rounded-full text-[12px] font-black shadow-xs transition-all duration-300 ${className}`}
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange"></span>
        </span>
        <span>
          {displayCount} {isSingular ? "Member" : "Members"} on Waitlist
        </span>
      </div>
    );
  }

  if (variant === "contact") {
    return (
      <div
        className={`group relative overflow-hidden inline-flex items-center gap-[10px] bg-white border border-[#dfe8f7] rounded-full px-[18px] py-[8px] shadow-[0_6px_20px_rgba(7,61,183,0.06)] my-[16px] transition-all duration-300 min-h-[46px] select-none hover:border-[#cbe0ff] hover:shadow-[0_8px_24px_rgba(7,85,232,0.12)] ${className}`}
        aria-live="polite"
      >
        {/* Animated Delivery Bike & Trails Feature */}
        <BikeAnimationLayer />

        {/* Foreground Content */}
        <div className="relative z-[10] flex items-center gap-[8px] md:gap-[10px] select-none pointer-events-none">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-orange shadow-[0_0_8px_rgba(255,121,0,0.6)]"></span>
          </span>
          <span className="text-[13px] md:text-[14px] font-[850] text-[#1d2e4d] tracking-tight whitespace-nowrap drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
            Live Waitlist:{" "}
            <span className="text-brand-orange font-black text-[15px] tabular-nums tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]">
              {displayCount}
            </span>{" "}
            <span className="text-[#3a4864] font-bold">
              {isSingular ? "member" : "members"} joined
            </span>
          </span>
        </div>
      </div>
    );
  }

  // Default: hero badge with animated Go-Zoon delivery bike
  return (
    <div
      className={`group relative overflow-hidden inline-flex items-center gap-[10px] px-[16px] py-[8px] rounded-full bg-white/95 border border-[#cbe0ff] shadow-[0_8px_20px_rgba(7,61,183,0.08)] mb-[24px] backdrop-blur-sm transition-all duration-300 min-h-[46px] select-none hover:border-[#ffcfb5] hover:shadow-[0_8px_24px_rgba(255,121,0,0.14)] ${className}`}
      aria-live="polite"
    >
      {/* Animated Delivery Bike & Trails Feature */}
      <BikeAnimationLayer />

      {/* Live Waitlist Information (Foreground: Crystal Clear, Stable, High-Contrast) */}
      <div className="relative z-[10] flex items-center gap-[8px] md:gap-[10px] select-none pointer-events-none">
        {/* Live Pulse Beacon */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
        </span>

        {/* Live Counter Text */}
        <span className="text-[13px] md:text-[14px] font-[850] text-[#061A3A] tracking-tight whitespace-nowrap drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
          Live Waitlist:{" "}
          <span className="text-brand-orange font-black text-[15px] tabular-nums tracking-wide drop-shadow-[0_1px_1px_rgba(255,255,255,0.95)]">
            {displayCount}
          </span>{" "}
          <span className="text-[#3a4864] font-bold">
            {isSingular ? "member" : "members"} joined
          </span>
        </span>
      </div>
    </div>
  );
}
