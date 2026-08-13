import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getTelegramConfig } from "@/lib/telegram";

import "./globals.css";
import "./mobile-base.css";
import "./mobile-compact.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Экзамен без багов",
    template: "%s | Экзамен без багов",
  },
  description:
    "Платформа курса подготовки к ЕГЭ по информатике: домашние задания, вебинары, материалы и прогресс.",
  applicationName: "Экзамен без багов",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Экзамен без багов",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#092535",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const telegramEnabled = getTelegramConfig().configured;

  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="responsive-page-shell min-h-full flex flex-col"
        data-telegram-enabled={telegramEnabled ? "true" : "false"}
      >
        {children}
      </body>
    </html>
  );
}
