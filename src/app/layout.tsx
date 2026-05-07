import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hemenrandevum - Online Randevu Sistemi",
  description: "Her sektörden işletme için online randevu yönetim sistemi. Kuaför, berber, güzellik merkezi, klinik ve daha fazlası için.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable}`}>
      <body className="min-h-screen bg-white font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
