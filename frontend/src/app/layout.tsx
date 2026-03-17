import type { Metadata, Viewport } from "next";
import { Manrope, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400","500","600","700","800"], display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", weight: ["400","500","600"], display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", weight: ["400","500","600","700"], style: ["normal","italic"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "BioLens — Material Intelligence", template: "%s | BioLens" },
  description: "Reveal the hidden petrochemical, origin, and lifecycle systems behind everyday products.",
};

export const viewport: Viewport = { themeColor: "#070b12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable} ${playfair.variable}`}>
      <body className="font-inter antialiased bg-[#070b12] text-[#f1f5f9]">
        {children}
      </body>
    </html>
  );
}
