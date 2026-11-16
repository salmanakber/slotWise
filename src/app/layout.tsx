import type { Metadata } from "next";
import { Figtree, Manrope, Sora, Young_Serif } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "600", "800"],
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "600", "700"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "600", "700"],
});

const youngSerif = Young_Serif({
  subsets: ["latin"],
  variable: "--font-young-serif",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Slotwise",
  description: "Webflow-native booking for service businesses and agencies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${figtree.variable} ${sora.variable} ${youngSerif.variable}`}
    >
      <body style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
