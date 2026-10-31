"use client";

import Image from "next/image";
import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Riders() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section 
      ref={ref}
      id="riders" 
      className={`riders audience section relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] min-h-[520px] grid grid-cols-1 md:grid-cols-[minmax(440px,42%)_1fr] items-center gap-[40px] md:gap-[70px] pt-[54px] md:pt-[75px] pb-[54px] md:pb-[70px] bg-white reveal-up ${isVisible ? 'reveal-visible' : ''}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />

      <div className="audience-copy max-w-full md:max-w-[520px]">
        <p className="eyebrow orange mb-[20px] text-brand-orange text-[17px] font-black tracking-[0.055em] uppercase after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:rounded-full after:bg-brand-orange">
          For Riders (Road-King)
        </p>
        <h2 className="mb-[7px] text-brand-blue text-[clamp(32px,2.8vw,43px)] leading-[1.08] font-black">
          Ride With Road-King.<br/><span className="text-brand-orange">Earn More. Grow More.</span>
        </h2>
        <p className="max-w-[430px] text-[#273954] text-[16px] leading-[1.46] font-[650]">
          Road-King is GO-ZOON&apos;s driver network, built to support you on every ride.
        </p>
        
        <div className="benefit-list grid gap-[18px] my-[28px]">
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ▣
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Insurance support</b> <small className="inline-flex ml-[6px] py-[4px] px-[9px] rounded-full text-brand-blue bg-[#dbe8ff] text-[9px] leading-none uppercase font-bold">Coming Soon</small><br/>We&apos;ve got your back, on and off the road.
            </p>
          </div>
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ♕
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Monthly bonus programme</b> <small className="inline-flex ml-[6px] py-[4px] px-[9px] rounded-full text-brand-blue bg-[#dbe8ff] text-[9px] leading-none uppercase font-bold">Coming Soon</small><br/>More deliveries, more rewards.
            </p>
          </div>
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ◎
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Discounted rider equipment</b><br/>Quality gear at the best prices.
            </p>
          </div>
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ϟ
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Better earnings potential</b><br/>Fair pay. More incentives. More value.
            </p>
          </div>
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ⌂
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Dedicated rider support</b><br/>Real people. Real help. Always here.
            </p>
          </div>
        </div>
        
        <Link 
          href="#contact" 
          className="w-full md:w-auto inline-flex items-center justify-center min-h-[48px] px-[22px] rounded-full font-heading font-black text-[14px] leading-none text-white bg-gradient-to-br from-brand-orange to-[#ff6d09] shadow-[0_12px_24px_rgba(255,74,20,0.22)] hover:shadow-[0_12px_28px_rgba(255,74,20,0.35),0_0_20px_rgba(255,74,20,0.15)] hover:scale-104 active:scale-98 transition-all duration-300 ease-out"
          data-role="Rider"
        >
          Apply as a Road-King Rider
          <b className="grid place-items-center w-[31px] h-[31px] ml-[13px] rounded-full bg-white text-brand-orange text-[20px] leading-none">→</b>
        </Link>
      </div>
      
      <div className="audience-visual rider-visual">
        <Image 
          src="/assets/rider-visual1.png" 
          alt="GO-ZOON Road-King rider on a scooter" 
          width={700} 
          height={600} 
          className="base w-full rounded-[18px] shadow-[0_16px_35px_rgba(18,39,81,0.14)]" 
        />
      </div>
    </section>
  );
}
