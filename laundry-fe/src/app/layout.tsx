import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/providers";

const fontSans = Inter({ subsets: ["vietnamese", "latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Nimble - Giặt ủi tận nơi",
  description: "Hệ thống quản lý giặt ủi tận nơi",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={cn("font-sans", fontSans.variable)}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
