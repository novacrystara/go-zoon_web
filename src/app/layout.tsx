import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});

export const viewport: Viewport = {
  themeColor: "#003cbd",
};

export const metadata: Metadata = {
  title: "GO-ZOON | Affordable, Transparent Delivery Platform",
  description: "GO-ZOON is a UK food delivery marketplace pilot built around 10% restaurant commission, transparent pricing, and fairer value for restaurants, customers, and riders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${plusJakartaSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
