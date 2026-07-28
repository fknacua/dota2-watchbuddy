import type { Metadata } from "next";
import { Teko, Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import ChatHistoryProvider from "@/components/ChatHistoryProvider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const teko = Teko({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-teko",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dota Watchbuddy",
  description: "A Dota 2 knowledge companion, grounded in real current data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(teko.variable, inter.variable, "font-sans", geist.variable)}>
      <body>
        <ChatHistoryProvider>{children}</ChatHistoryProvider>
      </body>
    </html>
  );
}
