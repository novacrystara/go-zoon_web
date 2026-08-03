import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Vision from "@/components/Vision";
import HowItWorks from "@/components/HowItWorks";
import Restaurants from "@/components/Restaurants";
import Customers from "@/components/Customers";
import Riders from "@/components/Riders";
import WhyGoZoon from "@/components/WhyGoZoon";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Vision />
        <HowItWorks />
        <Restaurants />
        <Customers />
        <Riders />
        <WhyGoZoon />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
