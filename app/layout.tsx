import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ShopProvider } from "@/lib/shopContext";
import ServiceWorker from "@/components/ServiceWorker";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASM Daily Fresh — Shop Manager",
  applicationName: "ASM Daily Fresh",
  description:
    "Daily bills, expenses, wholesale purchases and credit customers for a small shop. Mobile and tablet first.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // iOS ignores the manifest for home-screen launches and reads these instead.
  appleWebApp: {
    capable: true,
    title: "ASM",
    statusBarStyle: "default",
  },
  other: {
    // Next emits the modern "mobile-web-app-capable"; iOS before 15.4 only
    // honours the apple-prefixed spelling.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Lets the shell reach the screen edges when launched from the home screen;
  // the header and tab bar pad themselves back out of the safe areas.
  viewportFit: "cover",
  themeColor: "#f7f7f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body>
        <ShopProvider>{children}</ShopProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
