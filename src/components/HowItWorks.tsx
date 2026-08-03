"use client";

import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function HowItWorks() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section 
      ref={ref as any}
      id="how-it-works" 
      className={`flow section relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] pt-[36px] pb-[82px] text-center bg-[radial-gradient(90%_72%_at_50%_0%,#fff_0%,#fff_56%,transparent_57%),linear-gradient(180deg,#f6fbff_0%,#fff_75%)] reveal-up ${isVisible ? 'reveal-visible' : ''}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />

      <p className="eyebrow orange center mb-[20px] text-brand-orange text-[17px] font-black tracking-[0.055em] uppercase text-center after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:mx-auto after:rounded-full after:bg-brand-orange">
        How It Works
      </p>
      <h2 className="mb-[6px] text-brand-blue text-[clamp(32px,2.8vw,43px)] leading-[1.08] font-black">
        Simple. Connected. Reliable.
      </h2>
      <p className="section-lead max-w-[470px] mx-auto mb-[34px] text-[#40506e] font-extrabold leading-[1.35]">
        GO-ZOON connects four key parties in a seamless flow to deliver happiness at your doorstep.
      </p>

      <div className="flow-line grid grid-cols-1 md:grid-cols-[1fr_42px_1fr_42px_1fr_42px_1fr] md:items-start max-w-[935px] mx-auto gap-[26px] md:gap-0">
        
        <article className="flow-step blue group">
          <div className="flow-image w-[150px] h-[150px] mx-auto flex justify-center items-center rounded-full bg-white border-[3px] border-[#4264d8] shadow-[0_15px_30px_rgba(11,54,155,0.11)] overflow-hidden animate-[floatY_8s_ease-in-out_infinite_alternate] will-change-transform">
            <Image src="/assets/flow-admin.png" alt="Admin" width={118} height={118} className="w-[118px] h-[118px] object-contain rounded-full" />
          </div>
          <h3 className="min-h-[40px] mt-[10px] mb-[8px] text-brand-blue text-[17px] leading-[1.1] font-black">GO-ZOON Admin</h3>
          <p className="max-w-[145px] mx-auto text-[#243654] text-[13px] leading-[1.35] font-[750]">
            <b className="font-bold">1.</b> Customer places an order via GO-ZOON.
          </p>
        </article>
        
        <span className="arrow hidden md:block pt-[72px] text-[#233b6b] text-[38px] font-bold leading-none">→</span>

        <article className="flow-step orange-border group">
          <div className="flow-image w-[150px] h-[150px] mx-auto flex justify-center items-center rounded-full bg-white border-[3px] border-brand-orange shadow-[0_15px_30px_rgba(11,54,155,0.11)] overflow-hidden animate-[floatY_8s_ease-in-out_infinite_alternate] will-change-transform [animation-delay:-2s]">
            <Image src="/assets/flow-restaurant.png" alt="" width={118} height={118} className="w-[118px] h-[118px] object-contain rounded-full" />
          </div>
          <h3 className="min-h-[40px] mt-[10px] mb-[8px] text-brand-orange text-[17px] leading-[1.1] font-black">Restaurant</h3>
          <p className="max-w-[145px] mx-auto text-[#243654] text-[13px] leading-[1.35] font-[750]">
            <b className="font-bold">2.</b> GO-ZOON Admin routes the order to the Restaurant.
          </p>
        </article>

        <span className="arrow hidden md:block pt-[72px] text-[#233b6b] text-[38px] font-bold leading-none">→</span>

        <article className="flow-step blue group">
          <div className="flow-image w-[150px] h-[150px] mx-auto flex justify-center items-center rounded-full bg-white border-[3px] border-[#4264d8] shadow-[0_15px_30px_rgba(11,54,155,0.11)] overflow-hidden animate-[floatY_8s_ease-in-out_infinite_alternate] will-change-transform">
            <Image src="/assets/flow-rider.png" alt="" width={118} height={118} className="w-[118px] h-[118px] object-contain rounded-full" />
          </div>
          <h3 className="min-h-[40px] mt-[10px] mb-[8px] text-brand-blue text-[17px] leading-[1.1] font-black">Road-King (Driver)</h3>
          <p className="max-w-[145px] mx-auto text-[#243654] text-[13px] leading-[1.35] font-[750]">
            <b className="font-bold">3.</b> Restaurant prepares the order and Road-King driver is assigned.
          </p>
        </article>

        <span className="arrow hidden md:block pt-[72px] text-[#233b6b] text-[38px] font-bold leading-none">→</span>

        <article className="flow-step orange-border group">
          <div className="flow-image w-[150px] h-[150px] mx-auto flex justify-center items-center rounded-full bg-white border-[3px] border-brand-orange shadow-[0_15px_30px_rgba(11,54,155,0.11)] overflow-hidden animate-[floatY_8s_ease-in-out_infinite_alternate] will-change-transform [animation-delay:-2s]">
            <Image src="/assets/flow-customer.png" alt="" width={118} height={118} className="w-[118px] h-[118px] object-contain rounded-full" />
          </div>
          <h3 className="min-h-[40px] mt-[10px] mb-[8px] text-brand-orange text-[17px] leading-[1.1] font-black">Customer</h3>
          <p className="max-w-[145px] mx-auto text-[#243654] text-[13px] leading-[1.35] font-[750]">
            <b className="font-bold">4.</b> Road-King delivers the order to the Customer.
          </p>
        </article>

      </div>

      <div className="flow-note w-full md:w-[min(620px,100%)] mx-auto mt-[34px] grid grid-cols-1 md:grid-cols-[50px_1fr_1px_50px_1fr] items-center justify-items-center md:justify-items-start gap-[18px] p-[18px_32px] rounded-[16px] bg-[#eef5ff] text-[#25406c] text-center md:text-left group cursor-default">
        
        <span className="shield-icon grid place-items-center w-[44px] h-[44px] rounded-[14px] text-brand-blue border-[2px] border-[#bfd2ff] text-[24px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-110 will-change-transform">
          ✓
        </span>
        <p className="m-0 text-[14px] leading-[1.3]">
          <b className="font-bold">Admin coordinates</b><br/>Restaurant &amp; Road-King
        </p>
        
        <span className="divider hidden md:block h-[48px] w-[1px] bg-[#cbd8ee]"></span>
        
        <span className="scooter-icon grid place-items-center w-[44px] h-[44px] rounded-[14px] text-brand-blue border-[2px] border-[#bfd2ff] text-[24px] font-black transition-transform duration-400 ease-[cubic-bezier(0.2,1,0.3,1)] group-hover:rotate-[8deg] group-hover:scale-110 will-change-transform">
          ▻
        </span>
        <p className="m-0 text-[14px] leading-[1.3]">
          <b className="font-bold">Road-King delivers</b><br/>Restaurant → Customer
        </p>

      </div>
    </section>
  );
}
