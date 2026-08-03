"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Contact() {
  const { ref: sectionRef, isVisible } = useScrollReveal();
  const [role, setRole] = useState("");
  const [formStatus, setFormStatus] = useState("We will contact you soon!");

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Listen for clicks on anything with data-role to update the select
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const elementWithRole = target.closest('[data-role]') as HTMLElement;

      if (elementWithRole && elementWithRole.dataset.role) {
        setRole(elementWithRole.dataset.role);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formRef.current && !formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }
    setFormStatus("Thanks - we'll be in touch.");
    if (formRef.current) formRef.current.reset();
    setRole("");
  };

  return (
    <section
      ref={sectionRef as any}
      id="contact"
      className={`contact section relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] min-h-[500px] grid grid-cols-1 min-[1121px]:grid-cols-[430px_1fr] gap-[40px] items-center pt-[54px] md:pt-[76px] pb-[54px] md:pb-[72px] bg-gradient-to-b from-white to-[#f3f8ff] reveal-up ${isVisible ? 'reveal-visible' : ''}`}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />

      <div className="contact-copy max-w-full md:max-w-none">
        <p className="eyebrow orange mb-[20px] text-brand-orange text-[17px] font-black tracking-[0.055em] uppercase after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:rounded-full after:bg-brand-orange">
          Get Involved
        </p>
        <h2 className="mb-[14px] text-[#15233d] text-[34px] leading-[1.08] font-black">
          Let's Build the Future of Delivery — <span className="text-brand-orange">Together.</span>
        </h2>
        <p className="text-[#30425f] text-[18px] leading-[1.45] font-bold">
          Join the GO-ZOON waitlist and be part of something fair, transparent and built for everyone.
        </p>

        <div className="role-cards grid grid-cols-2 md:grid-cols-4 gap-[14px] mt-[28px]">
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
            <span className="text-[11px] md:text-[12px] font-[600] text-[#5c6a86] leading-[1.3] text-center">Business & partnership<br/>opportunities</span>
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
            <span className="text-[11px] md:text-[12px] font-[600] text-[#5c6a86] leading-[1.3] text-center">Register your<br/>restaurant's interest</span>
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
          <h2 className="mb-[18px] text-[#15233d] text-[27px] font-black">Join the Waitlist</h2>

          <div className="field-grid grid grid-cols-1 md:grid-cols-2 gap-y-[16px] gap-x-[22px]">
            <label className="grid gap-[7px] text-[#3a4864] text-[12px] font-[850]">
              <span>I am a <b className="text-brand-orange">*</b></span>
              <select id="role" required className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors" value={role} onChange={(e) => setRole(e.target.value)}>
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
              <input type="text" required placeholder="Your full name" className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors" />
            </label>
            <label className="grid gap-[7px] text-[#3a4864] text-[12px] font-[850]">
              <span>Email Address <b className="text-brand-orange">*</b></span>
              <input type="email" required placeholder="you@example.com" className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors" />
            </label>
            <label className="grid gap-[7px] text-[#3a4864] text-[12px] font-[850]">
              <span>Phone Number</span>
              <input type="tel" placeholder="07XXXXXXXXX" className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors" />
            </label>
          </div>

          <label className="grid gap-[7px] mt-[16px] text-[#3a4864] text-[12px] font-[850]">
            <span>Message (Optional)</span>
            <textarea rows={4} placeholder="Tell us how you'd like to be involved..." className="w-full border-[2px] border-[#dfe8f7] rounded-[8px] p-[12px_14px] text-[#15233d] bg-white text-[13px] outline-none focus:border-[#7ba1ff] focus:shadow-[0_0_0_4px_rgba(7,61,183,0.10)] transition-colors resize-y" />
          </label>

          <button className="submit w-full mt-[16px] min-h-[48px] border-none rounded-full font-heading font-black text-[14px] leading-none text-white bg-gradient-to-br from-brand-orange to-[#ff6d09] shadow-[0_12px_24px_rgba(255,74,20,0.22)] cursor-pointer hover:shadow-[0_12px_28px_rgba(255,74,20,0.35),0_0_20px_rgba(255,74,20,0.15)] hover:scale-104 active:scale-98 transition-all duration-300 ease-out flex items-center justify-center gap-[8px]" type="submit">
            ➤ Send
          </button>

          <p className="form-note mt-[9px] mb-0 text-[#3a4864] text-center text-[12px] font-[800]" aria-live="polite">
            {formStatus}
          </p>
        </form>

        <div className="relative hidden min-[1121px]:block w-full h-full">
          <Image src="/assets/contact-visual.png" alt="Business meeting about GO-ZOON" fill sizes="100vw" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
