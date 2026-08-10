import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getTelegramConfig } from "@/lib/telegram";

import "./globals.css";

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
        className="min-h-full flex flex-col"
        data-telegram-enabled={telegramEnabled ? "true" : "false"}
      >
        {children}
      </body>
    </html>
  );
}
