import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="grid grid-cols-1 md:grid-cols-2 min-[1121px]:grid-cols-[280px_230px_220px_300px] gap-[48px] px-[28px] min-[1121px]:px-[max(60px,calc((100vw-1215px)/2))] pt-[34px] pb-[18px] text-[#dbe6ff] bg-gradient-to-br from-[#00246d] to-[#001241]">
      <div className="footer-brand">
        <Image 
          src="/assets/go-zoon-logo-horizontal.png" 
          alt="GO-ZOON" 
          width={155} 
          height={42} 
          className="w-[155px] h-auto mb-[18px]" 
        />
        <p className="block m-0 mb-[9px] text-[#dbe6ff] text-[13px] leading-[1.45] font-[650]">
          GO-ZOON is a UK food delivery marketplace built to be fair to restaurants, customers, and riders.
        </p>
      </div>
      
      <div>
        <h3 className="mb-[16px] text-white text-[15px] font-heading font-bold">Quick Links</h3>
        <div className="flex flex-col gap-[9px]">
          {["Home", "How It Works", "For Restaurants", "For Customers", "For Riders", "Why GO-ZOON", "Contact"].map((item) => {
            const id = item === "Home" ? "#home" : `#${item.toLowerCase().replace(/ /g, "-").replace("for-", "")}`;
            return (
              <Link 
                key={item} 
                href={id} 
                className="block m-0 text-[#dbe6ff] text-[13px] leading-[1.45] font-[650] hover:text-white transition-colors"
              >
                {item}
              </Link>
            )
          })}
        </div>
      </div>
      
      <div>
        <h3 className="mb-[16px] text-white text-[15px] font-heading font-bold">Contact Us</h3>
        <p className="block m-0 mb-[9px] text-[#dbe6ff] text-[13px] leading-[1.45] font-[650]">gozooncoming@gmail.com</p>
        <p className="block m-0 mb-[9px] text-[#dbe6ff] text-[13px] leading-[1.45] font-[650]">+44 7733648221</p>
        <p className="block m-0 mb-[9px] text-[#dbe6ff] text-[22px] leading-[1.45] font-[650] tracking-[0.18em]">f · ◎ · in · X</p>
      </div>
      
      <div>
        <h3 className="mb-[16px] text-white text-[15px] font-heading font-bold">Important</h3>
        <p className="block m-0 mb-[9px] text-[#dbe6ff] text-[13px] leading-[1.45] font-[650]">
          GO-ZOON is currently in pilot stage. Features marked &quot;Planned&quot; are not yet live.
        </p>
      </div>
      
      <div className="col-span-1 md:col-span-2 min-[1121px]:col-span-4 flex flex-col md:flex-row justify-between gap-[20px] pt-[16px] border-t border-white/14">
        <p className="block m-0 mb-[9px] md:mb-0 text-[#dbe6ff] text-[13px] leading-[1.45] font-[650]">
          © 2026 GO-ZOON. All rights reserved.
        </p>
        <p className="block m-0 mb-[9px] md:mb-0 text-[#dbe6ff] text-[13px] leading-[1.45] font-[650]">
          Privacy Policy&nbsp;&nbsp; | &nbsp;&nbsp;Terms of Use
        </p>
      </div>
    </footer>
  );
}
