import type { Metadata, Viewport } from "next";
import { Figtree, Manrope, Sora, Young_Serif } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://slotwise.hindaralabs.com";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a1018" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1018" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Slotwise — Bookings that look like your site",
    template: "%s · Slotwise",
  },
  description:
    "Webflow-native booking for agencies and service brands. Multi-theme widgets, CMS sync, Stripe deposits, zero commission.",
  applicationName: "Slotwise",
  keywords: [
    "Webflow booking",
    "scheduling",
    "appointments",
    "Stripe Connect",
    "agency booking app",
    "Slotwise",
  ],
  authors: [{ name: "Slotwise" }],
  creator: "Slotwise",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Slotwise",
    title: "Slotwise — Bookings that look like your site",
    description:
      "The Webflow-native scheduler for agencies and service brands. Styled your way. Paid straight to you.",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Slotwise" }],
  },
  twitter: {
    card: "summary",
    title: "Slotwise",
    description: "Webflow-native booking. Zero commission.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon-32.png"],
  },
  manifest: "/site.webmanifest",
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
      <body style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
