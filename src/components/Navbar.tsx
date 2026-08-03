"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-20 h-[74px] md:h-[86px] transition-all duration-400 ease-out flex items-center justify-between px-[26px] md:px-[34px] xl:px-[58px] 
      ${scrolled ? 'bg-white/85 shadow-[0_10px_40px_rgba(12,47,122,0.08)]' : 'bg-white/75'}
      backdrop-blur-[24px]`}
      id="top"
    >
      <Link href="#home" className="brand flex items-center" aria-label="GO-ZOON home" onClick={closeMenu}>
        <Image 
          src="/assets/go-zoon-logo-horizontal.png" 
          alt="GO-ZOON - Every Delivery Has a Story" 
          width={222} 
          height={60} 
          className="w-[160px] md:w-[175px] min-[1121px]:w-[185px] xl:w-[200px] h-auto -ml-[6px] xl:-ml-[10px]"
          priority
        />
      </Link>

      <button 
        className="min-[1121px]:hidden w-[44px] h-[44px] bg-brand-blue border-none rounded-[12px] flex flex-col justify-center items-center cursor-pointer"
        type="button" 
        aria-label="Open menu" 
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="block w-[20px] h-[2px] bg-white my-[2.5px]"></span>
        <span className="block w-[20px] h-[2px] bg-white my-[2.5px]"></span>
        <span className="block w-[20px] h-[2px] bg-white my-[2.5px]"></span>
      </button>

      <nav 
        className={`font-heading font-extrabold text-[13px] xl:text-[14px] text-[#172541] 
        ${isOpen ? 'flex' : 'hidden'} 
        min-[1121px]:flex flex-col min-[1121px]:flex-row items-stretch min-[1121px]:items-center justify-center gap-0 min-[1121px]:gap-[14px] xl:gap-[24px]
        absolute min-[1121px]:static top-[74px] md:top-[86px] left-0 right-0 bg-white min-[1121px]:bg-transparent shadow-[0_20px_40px_rgba(0,20,70,0.12)] min-[1121px]:shadow-none px-[28px] py-[18px] min-[1121px]:p-0
        `}
        aria-label="Primary navigation"
      >
        {["Home", "How It Works", "For Restaurants", "For Customers", "For Riders", "Why GO-ZOON", "Contact"].map((item) => {
          const id = item === "Home" ? "#home" : `#${item.toLowerCase().replace(/ /g, "-").replace("for-", "")}`;
          return (
            <Link 
              key={item}
              href={id} 
              className={`relative whitespace-nowrap py-[14px] min-[1121px]:py-0 hover:text-brand-blue transition-colors group ${item === 'Home' ? 'text-brand-blue' : ''}`}
              onClick={closeMenu}
            >
              {item}
              <span className={`hidden min-[1121px]:block absolute left-0 right-0 -bottom-[18px] h-[3px] rounded-full bg-brand-orange origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 ${item === 'Home' ? 'scale-x-100' : ''}`}></span>
            </Link>
          )
        })}
      </nav>

      <Link 
        href="#contact" 
        className="hidden min-[1121px]:inline-flex items-center justify-center min-h-[48px] xl:min-h-[54px] px-[20px] xl:px-[28px] rounded-full font-heading font-black text-[14px] xl:text-[16px] leading-none text-white bg-gradient-to-br from-brand-orange to-[#ff6d09] shadow-[0_12px_24px_rgba(255,74,20,0.22)] hover:shadow-[0_12px_28px_rgba(255,74,20,0.35),0_0_20px_rgba(255,74,20,0.15)] hover:scale-104 active:scale-98 transition-all duration-300 ease-out"
        data-role="Other"
      >
        Join the Waitlist
      </Link>
    </header>
  );
}
