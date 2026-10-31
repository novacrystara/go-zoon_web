"use client";

import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useNumberCounter } from "@/hooks/useNumberCounter";

export default function Vision() {
  const { ref: sectionRef, isVisible } = useScrollReveal();
  
  const { currentText: industryCommission, elementRef: industryRef } = useNumberCounter("20-35%");
  const { currentText: gozoonCommission, elementRef: gozoonRef } = useNumberCounter("10%");

  return (
    <section 
      ref={sectionRef}
      id="vision" 
      className={`vision section relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] min-h-[426px] grid grid-cols-1 lg:grid-cols-[1fr_470px] gap-[40px] lg:gap-[90px] items-center pt-[54px] pb-[54px] 
        bg-[radial-gradient(circle_at_5%_20%,rgba(7,61,183,0.10)_0_2px,transparent_3px),radial-gradient(circle_at_93%_30%,rgba(7,61,183,0.12)_0_2px,transparent_3px),linear-gradient(160deg,#f8fcff_0%,#edf7ff_58%,#fff_100%)]
        bg-[length:22px_22px,22px_22px,auto] bg-[position:0_0,0_0,auto]
        reveal-up ${isVisible ? 'reveal-visible' : ''}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />
      
      <div className="vision-bg absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <Image src="/assets/vision section reveal-up reveal-visible1.png" alt="" fill sizes="100vw" className="object-cover opacity-[0.15] md:opacity-100" />
      </div>
      
      <div className="vision-copy relative z-[1] max-w-full lg:max-w-[430px] ml-0 lg:ml-[150px] mx-auto lg:mx-0 text-center lg:text-left">
        <p className="eyebrow orange mb-[20px] text-brand-orange text-[17px] font-black tracking-[0.055em] uppercase after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:rounded-full after:bg-brand-orange">
          Our Vision
        </p>
        <h2 className="mb-[14px] text-brand-blue text-[clamp(32px,2.8vw,43px)] leading-[1.08] font-black">
          Building a fairer delivery future
        </h2>
        <p className="mb-[16px] text-[#283955] text-[18px] leading-[1.5]">
          Our Vision is to build the UK&apos;s most <strong className="text-brand-orange font-bold">affordable, transparent and restaurant-friendly</strong> delivery platform.
        </p>
        <p className="text-[#283955] text-[18px] leading-[1.5]">
          The industry charges restaurants 20-35% commission. GO-ZOON charges only 10%. Lower commission means
          restaurants keep more, and can pass savings to customers.
        </p>
      </div>
      
      <div className="commission-card relative z-[1] w-full lg:w-[365px] min-h-[352px] mx-auto lg:ml-auto lg:mr-[120px] py-[35px] px-[20px] md:px-[40px] text-center rounded-[24px] bg-white/92 shadow-[0_18px_45px_rgba(1,39,113,0.16)] backdrop-blur-[16px] transition-all duration-300 ease-out hover:-translate-y-[8px] hover:shadow-[0_24px_48px_rgba(1,39,113,0.18)] will-change-transform">
        <p className="mb-[8px] text-[#72809a] font-black tracking-[0.07em] uppercase text-[14px]">Industry Average</p>
        <strong ref={industryRef} className="block text-brand-blue text-[48px] md:text-[57px] leading-none font-black">{industryCommission}</strong>
        <span className="block mt-[6px] text-[#33435f] text-[18px] font-bold">commission</span>
        
        <em className="grid place-items-center w-[42px] h-[42px] my-[26px] mx-auto rounded-full text-brand-orange not-italic font-black uppercase bg-white shadow-[inset_0_0_0_2px_#dce6f7]">vs</em>
        
        <p className="mb-[8px] text-[#72809a] font-black tracking-[0.07em] uppercase text-[14px]">GO-ZOON</p>
        <strong ref={gozoonRef} className="block text-brand-orange text-[48px] md:text-[57px] leading-none font-black">{gozoonCommission}</strong>
        <span className="block mt-[6px] text-[#33435f] text-[18px] font-bold">commission</span>
      </div>
    </section>
  );
}
