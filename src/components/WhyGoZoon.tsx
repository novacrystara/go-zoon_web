"use client";

import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useNumberCounter } from "@/hooks/useNumberCounter";

export default function WhyGoZoon() {
  const { ref, isVisible } = useScrollReveal();
  const { currentText: industryCommission, elementRef: industryRef } = useNumberCounter("20-35%");
  const { currentText: gozoonCommission, elementRef: gozoonRef } = useNumberCounter("10%");

  return (
    <section
      ref={ref as any}
      id="why"
      className={`why section relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] min-h-[380px] grid grid-cols-1 md:grid-cols-[350px_1fr] min-[1121px]:grid-cols-[350px_minmax(280px,1fr)_90px_minmax(280px,1fr)] items-center gap-[20px] min-[1121px]:gap-[18px] pt-[52px] pb-[52px] text-white
      bg-[radial-gradient(circle_at_96%_23%,rgba(0,111,255,0.45)_0_2px,transparent_3px),linear-gradient(135deg,#001b60_0%,#001045_100%)] bg-[length:22px_22px,auto] bg-[position:0_0,0_0]
      reveal-up ${isVisible ? 'reveal-visible' : ''}
      after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-[390px] after:h-[148px] after:opacity-[0.34] after:bg-[linear-gradient(to_top,rgba(255,255,255,0.7),rgba(255,255,255,0)_1px),linear-gradient(135deg,transparent_46%,rgba(255,255,255,0.75)_47%_53%,transparent_54%)] after:bg-[position:0_100%,0_100%] after:bg-[size:100%_18px,36px_90px]`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="why-bg absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none mix-blend-screen opacity-10">
        <Image src="/assets/why section reveal-up reveal-visible.png" alt="" fill sizes="100vw" className="why-bg-image object-cover" />
      </div>

      <div className="why-copy relative z-[1] md:row-span-3 min-[1121px]:row-span-1">
        <p className="eyebrow orange mb-[20px] text-brand-orange text-[17px] font-black tracking-[0.055em] uppercase after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:rounded-full after:bg-brand-orange">
          Why GO-ZOON
        </p>
        <h2 className="mb-[14px] text-white text-[33px] leading-[1.08] font-black">
          Lower Commission.<br />More Value for Everyone.
        </h2>
        <p className="text-[#dbe6ff] text-[18px] leading-[1.45] font-bold">
          Lower commission means restaurants keep more, and can pass savings to customers.
        </p>
      </div>

      <div className="compare dark-card relative z-[1] min-h-[305px] p-[34px_44px] rounded-[18px] text-white bg-white/12 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] max-[1120px]:-translate-x-[7px]">
        <p className="mb-[8px] text-[#72809a] font-black tracking-[0.07em] uppercase text-[14px]">Industry Average</p>
        <strong ref={industryRef as any} className="block text-[48px] leading-none font-black">{industryCommission}</strong>
        <span className="block my-[4px] mb-[22px] font-[800]">commission</span>
        <ul className="grid gap-[11px] m-0 pt-[18px] pb-0 border-t border-white/16 list-none font-[850]">
          <li className="flex items-center text-[15px] before:content-['×'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-brand-orange before:border-[2px] before:border-brand-orange before:text-[14px] before:leading-none">Higher menu prices</li>
          <li className="flex items-center text-[15px] before:content-['×'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-brand-orange before:border-[2px] before:border-brand-orange before:text-[14px] before:leading-none">Higher fees for restaurants</li>
          <li className="flex items-center text-[15px] before:content-['×'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-brand-orange before:border-[2px] before:border-brand-orange before:text-[14px] before:leading-none">Hidden charges</li>
          <li className="flex items-center text-[15px] before:content-['×'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-brand-orange before:border-[2px] before:border-brand-orange before:text-[14px] before:leading-none">Less earnings for riders</li>
          <li className="flex items-center text-[15px] before:content-['×'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-brand-orange before:border-[2px] before:border-brand-orange before:text-[14px] before:leading-none">Higher prices for customers</li>
        </ul>
      </div>

      <div className="vs hidden min-[1121px]:grid relative z-[1] place-items-center w-[92px] h-[92px] rounded-full text-white bg-[#001d61] border-[3px] border-white/15 text-[28px] font-black shadow-[0_10px_30px_rgba(0,0,0,0.25)] justify-self-center mx-auto">
        VS
      </div>
      <div className="vs grid min-[1121px]:hidden relative z-[1] place-items-center w-[60px] h-[60px] rounded-full text-white bg-[#001d61] border-[3px] border-white/15 text-[18px] font-black shadow-[0_10px_30px_rgba(0,0,0,0.25)] justify-self-center mx-auto my-[10px]">
        VS
      </div>

      <div className="compare light-card relative z-[1] min-h-[305px] p-[34px_44px] rounded-[18px] text-[#17233d] bg-white shadow-[0_18px_45px_rgba(1,39,113,0.16)] max-[1120px]:-translate-x-[7px] max-[1120px]:-translate-y-[6px]">
        <p className="mb-[8px] text-[#323b50] font-black tracking-[0.07em] uppercase text-[14px]">GO-ZOON</p>
        <strong ref={gozoonRef as any} className="block text-brand-orange text-[48px] leading-none font-black">{gozoonCommission}</strong>
        <span className="block text-[#17233d] my-[4px] mb-[22px] font-[800]">commission</span>
        <ul className="grid gap-[11px] m-0 pt-[18px] pb-0 border-t border-[#e5eaf4] list-none font-[850]">
          <li className="flex items-center text-[15px] before:content-['✓'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-white before:bg-brand-orange before:text-[14px] before:leading-none">Exact menu prices</li>
          <li className="flex items-center text-[15px] before:content-['✓'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-white before:bg-brand-orange before:text-[14px] before:leading-none">Lower fees for restaurants</li>
          <li className="flex items-center text-[15px] before:content-['✓'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-white before:bg-brand-orange before:text-[14px] before:leading-none">100% transparent</li>
          <li className="flex items-center text-[15px] before:content-['✓'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-white before:bg-brand-orange before:text-[14px] before:leading-none">Better earnings for riders</li>
          <li className="flex items-center text-[15px] before:content-['✓'] before:inline-grid before:place-items-center before:w-[18px] before:h-[18px] before:mr-[12px] before:rounded-full before:text-white before:bg-brand-orange before:text-[14px] before:leading-none">More savings for customers</li>
        </ul>
      </div>
    </section>
  );
}
