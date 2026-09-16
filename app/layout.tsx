import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Radio Atlas — A world of sound",
  description: "Discover and listen to live radio stations from around the world. Explore the planet and hear what's playing in every city right now.",
  openGraph: {
    title: "Radio Atlas — A world of sound",
    description: "Discover and listen to live radio stations from around the world.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-black font-sans text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
