"use client";

import Image from "next/image";
import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Customers() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section 
      ref={ref as any}
      id="customers" 
      className={`customers audience section relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] min-h-[610px] grid grid-cols-1 md:grid-cols-[minmax(440px,42%)_1fr] items-center gap-[40px] md:gap-[70px] pt-[54px] md:pt-[75px] pb-[54px] md:pb-[70px] bg-[radial-gradient(circle_at_76%_48%,rgba(117,169,255,0.18),transparent_30%),#fff] reveal-up ${isVisible ? 'reveal-visible' : ''}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />

      <div className="audience-copy max-w-full md:max-w-[520px] min-[1121px]:col-start-1 min-[1121px]:row-start-1">
        <p className="eyebrow orange mb-[20px] text-brand-orange text-[17px] font-black tracking-[0.055em] uppercase after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:rounded-full after:bg-brand-orange">
          For Customers
        </p>
        <h2 className="mb-[7px] text-brand-blue text-[clamp(32px,2.8vw,43px)] leading-[1.08] font-black">
          Order Smarter.<br/><span className="text-brand-orange">Pay Less.</span>
        </h2>
        <p className="max-w-[430px] text-[#273954] text-[16px] leading-[1.46] font-[650]">
          Enjoy restaurant menu prices with affordable delivery fees and complete transparency.
        </p>
        
        <div className="benefit-list grid gap-[18px] my-[28px]">
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ◇
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Restaurant menu prices</b><br/>No markup. What you see is what restaurants charge.
            </p>
          </div>
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ♙
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Affordable delivery fees</b><br/>Lower fees compared to other delivery apps.
            </p>
          </div>
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ✓
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Transparent pricing</b><br/>No hidden fees or surprise charges.
            </p>
          </div>
          <div className="benefit flex md:grid grid-cols-[58px_1fr] items-center gap-[14px] group">
            <span className="grid place-items-center w-[52px] h-[52px] rounded-[16px] text-brand-blue bg-[#f3f7ff] border-[2px] border-[#d7e4ff] text-[28px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-112 will-change-transform">
              ϟ
            </span>
            <p className="m-0 text-[#30425e] text-[13px] leading-[1.35] font-bold">
              <b className="text-[#1d2e4d] text-[14px]">Faster ordering experience</b><br/>Quick, simple and reliable from order to doorstep.
            </p>
          </div>
        </div>
        
        <Link 
          href="#contact" 
          className="w-full md:w-auto inline-flex items-center justify-center min-h-[48px] px-[22px] rounded-full font-heading font-black text-[14px] leading-none text-white bg-gradient-to-br from-brand-blue to-[#0b55d5] shadow-[0_12px_24px_rgba(7,61,183,0.22)] hover:scale-104 active:scale-98 transition-all duration-300 ease-out"
          data-role="Customer"
        >
          Get Notified at Launch
          <b className="grid place-items-center w-[31px] h-[31px] ml-[13px] rounded-full bg-white text-brand-orange text-[20px] leading-none">→</b>
        </Link>
      </div>

      <div className="audience-visual customers-visual relative block pointer-events-none min-[1121px]:col-start-2 min-[1121px]:row-start-1">
        <Image 
          src="/assets/customers-visual1.png" 
          alt="GO-ZOON customer app price transparency mockup" 
          width={700} 
          height={600} 
          className="base relative z-[1] w-full max-w-[131.39%] left-[-15%] top-[37%] h-auto rounded-none transition-transform duration-500 ease-[cubic-bezier(0.2,1,0.3,1)] hover:scale-103 will-change-transform" 
        />
      </div>
    </section>
  );
}
