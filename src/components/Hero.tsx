import Image from "next/image";
import Link from "next/link";
import WaitlistLiveBadge from "./WaitlistLiveBadge";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-[28px] md:px-[max(60px,calc((100vw-1215px)/2))] min-h-[625px] grid grid-cols-1 lg:grid-cols-[minmax(400px,46%)_1fr] items-center gap-[24px] pt-[50px] md:pt-[50px] bg-[radial-gradient(circle_at_82%_34%,rgba(151,194,255,0.30),transparent_28%),linear-gradient(180deg,#fff_0%,#fff_74%,#f6fbff_100%)]" id="home">

      {/* Subtle section divider fades */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />

      <div className="hero-copy relative z-[10] max-w-full lg:max-w-[560px] mx-auto lg:mx-0 text-center lg:text-left flex flex-col items-center lg:items-start">

        <p className="eyebrow mb-[20px] text-brand-blue text-[17px] font-black tracking-[0.055em] uppercase after:content-[''] after:block after:w-[42px] after:h-[3px] after:mt-[14px] after:rounded-full after:bg-brand-orange opacity-0 translate-y-[40px] animate-[fadeUp_0.8s_cubic-bezier(0.2,1,0.3,1)_forwards] [animation-delay:120ms]">
          Every Delivery Has a Story
        </p>

        <h1 className="mb-[23px] text-brand-blue text-[39px] md:text-[clamp(46px,4.3vw,64px)] leading-[0.98] md:leading-[1.05] font-black tracking-[0.03em] opacity-0 translate-y-[40px] animate-[fadeUp_0.8s_cubic-bezier(0.2,1,0.3,1)_forwards] [animation-delay:240ms]">
          The UK&apos;s Most Affordable, <span className="text-brand-orange">Transparent</span> Delivery Platform
        </h1>

        <p className="hero-subtitle max-w-[430px] mb-[20px] text-[20px] md:text-[25px] leading-[1.35] text-[#263650] opacity-0 translate-y-[40px] animate-[fadeUp_0.8s_cubic-bezier(0.2,1,0.3,1)_forwards] [animation-delay:360ms]">
          Built to be fair to restaurants, customers, and riders.
        </p>

        {/* Live Waitlist Members Count Badge in Top Section */}
        <div className="opacity-0 translate-y-[40px] animate-[fadeUp_0.8s_cubic-bezier(0.2,1,0.3,1)_forwards] [animation-delay:420ms]">
          <WaitlistLiveBadge variant="hero" />
        </div>

        <div className="button-row grid md:flex md:flex-wrap gap-[26px] mb-[16px] lg:mb-[30px] w-full md:w-auto relative opacity-0 translate-y-[40px] animate-[fadeUp_0.8s_cubic-bezier(0.2,1,0.3,1)_forwards] [animation-delay:480ms]">
          <Link
            href="#contact"
            className="w-full md:w-auto inline-flex items-center justify-center min-h-[54px] px-[28px] rounded-full font-heading font-black text-[16px] leading-none text-white bg-gradient-to-br from-brand-orange to-[#ff6d09] shadow-[0_12px_24px_rgba(255,74,20,0.22)] hover:shadow-[0_12px_28px_rgba(255,74,20,0.35),0_0_20px_rgba(255,74,20,0.15)] hover:scale-104 active:scale-98 transition-all duration-300 ease-out"
            data-role="Other"
          >
            Join the Waitlist
            <b className="grid place-items-center w-[31px] h-[31px] ml-[13px] rounded-full bg-white text-brand-orange text-[20px] leading-none">→</b>
          </Link>
          <Link
            href="#how-it-works"
            className="w-full md:w-auto inline-flex items-center justify-center min-h-[54px] px-[28px] rounded-full font-heading font-black text-[16px] leading-none text-brand-blue bg-white border-[2px] border-[#b7c8f6] shadow-[0_10px_28px_rgba(7,61,183,0.08)] hover:shadow-[0_12px_28px_rgba(255,74,20,0.35),0_0_20px_rgba(255,74,20,0.15)] hover:scale-104 active:scale-98 transition-all duration-300 ease-out group"
          >
            See How It Works
            <b className="grid place-items-center w-[31px] h-[31px] ml-[13px] rounded-full bg-white text-brand-orange text-[20px] leading-none">▷</b>
          </Link>
        </div>

        <div className="store-badges flex justify-center lg:justify-start mx-auto lg:mx-0 gap-[16px] items-center w-full max-w-[360px] lg:w-[375px] lg:max-w-none mb-[40px] lg:mb-0 relative opacity-0 translate-y-[40px] animate-[fadeUp_0.8s_cubic-bezier(0.2,1,0.3,1)_forwards] [animation-delay:600ms]">
          <button type="button" className="store-badge-btn max-md:h-[44px] hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer border-none bg-transparent p-0">
            <Image src="/assets/app_store-badge.png" alt="Download on the App Store" width={150} height={44} className="h-full w-auto" />
          </button>
          <button type="button" className="store-badge-btn max-md:h-[44px] hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer border-none bg-transparent p-0">
            <Image src="/assets/google_play-badge.png" alt="Get it on Google Play" width={150} height={44} className="h-full w-auto" />
          </button>
        </div>
      </div>

      <div className="hero-art hero-visual flex items-center justify-end self-center md:animate-[floatY_5s_ease-in-out_infinite] md:will-change-transform z-[1]" aria-hidden="true">
        <Image
          src="/assets/landing-page-gozoon.png"
          alt="GO-ZOON Delivery"
          width={640}
          height={458}
          className="base hero-visual-img w-full max-w-[500px] lg:max-w-[560px] xl:max-w-[620px] h-auto drop-shadow-[0_18px_24px_rgba(1,22,54,0.10)]"
          priority
        />
      </div>
    </section>
  );
}
