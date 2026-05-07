"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowUpRight, Clock, Users, BarChart3, CalendarCheck } from "lucide-react";
import Link from "next/link";

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <div className="text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
    <div className="text-sm text-slate-500">{label}</div>
  </div>
);

const SoftButton = ({
  children,
  className = "",
  href,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  [key: string]: unknown;
}) => {
  const cls =
    "rounded-full px-5 py-2.5 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2 " +
    "bg-indigo-700 text-white hover:bg-indigo-600 focus:ring-indigo-500 " +
    className;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
};

function MiniBars() {
  return (
    <div className="mt-6 flex h-36 items-end gap-4 rounded-xl bg-gradient-to-b from-indigo-50 to-white p-4">
      {[18, 48, 72, 96].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0, opacity: 0.6 }}
          animate={{ height: h }}
          transition={{ delay: 0.5 + i * 0.15, type: "spring" }}
          className="w-10 rounded-xl bg-gradient-to-t from-indigo-200 to-indigo-400 shadow-inner"
        />
      ))}
    </div>
  );
}

function CalendarOrb() {
  return (
    <motion.svg
      initial={{ rotate: -8 }}
      animate={{ rotate: 0 }}
      transition={{ duration: 2, type: "spring" }}
      width="220"
      height="220"
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <circle cx="110" cy="110" r="56" fill="url(#grad)" opacity="0.95" />
      <circle cx="94" cy="98" r="10" fill="white" opacity="0.45" />
      <circle cx="132" cy="126" r="8" fill="white" opacity="0.35" />
      <motion.ellipse
        cx="110"
        cy="110"
        rx="100"
        ry="34"
        stroke="white"
        strokeOpacity="0.6"
        fill="none"
        animate={{ strokeDashoffset: [200, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        strokeDasharray="200 200"
      />
      <motion.circle
        cx="210"
        cy="110"
        r="4"
        fill="white"
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
    </motion.svg>
  );
}

const sectors = ["Kuaför", "Berber", "Güzellik", "Klinik", "SPA", "Veteriner"];

export default function HemenRandevumLandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#F3F5F7] font-sans">
      {/* Nav */}
      <nav className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 py-6 md:px-0">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-700 text-white shadow">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-900">hemenrandevum</span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          {["Özellikler", "Sektörler", "Nasıl Çalışır?", "Demo"].map((item) => (
            <a key={item} href="#" className="text-sm text-slate-600 hover:text-slate-900">
              {item}
            </a>
          ))}
        </div>
        <div className="hidden gap-2 md:flex">
          <Link
            href="/admin"
            className="rounded-full px-4 py-2 text-sm text-slate-700 hover:bg-white transition"
          >
            Yönetici Girişi
          </Link>
          <SoftButton href="/salon/demo-kuafor">Demo&apos;yu Dene</SoftButton>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-6 px-4 pb-14 md:grid-cols-2 md:px-0">
        {/* Sol: başlık */}
        <div className="flex flex-col justify-center space-y-8 pr-2">
          <div>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-6xl">
              Randevunu şimdi al,
              <br />
              bekletme.
            </h1>
            <p className="mt-4 max-w-md text-slate-600">
              <span className="font-medium text-slate-900">hemenrandevum</span> ile kuaför, berber,
              güzellik merkezi ve klinikler için kolayca online randevu sistemi kur.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <SoftButton href="/salon/demo-kuafor">
              Demo&apos;yu Dene <ArrowUpRight className="ml-1 inline h-4 w-4" />
            </SoftButton>
            <Link
              href="/salon/demo-berber"
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Berber Demosu
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-2 md:max-w-sm">
            <Stat label="Desteklenen Sektör" value="8+" />
            <Stat label="Aylık Randevu" value="7/24" />
          </div>

          <div className="mt-6 flex items-center gap-8 opacity-70">
            <span className="text-xs text-slate-500">HER SEKTÖRE UYGUN</span>
            <div className="flex items-center gap-4 text-slate-400">
              {sectors.map((s) => (
                <span key={s} className="text-xs font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ: kart grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Güvenli panel kartı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative col-span-1 overflow-hidden rounded-xl bg-gradient-to-b from-indigo-900 to-indigo-800 p-6 text-indigo-50 shadow-lg"
          >
            <div className="absolute inset-0">
              <svg
                className="absolute inset-0 h-full w-full opacity-30"
                viewBox="0 0 400 400"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <radialGradient id="rg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
                <rect width="400" height="400" fill="url(#rg)" />
                {[...Array(12)].map((_, i) => (
                  <circle
                    key={i}
                    cx="200"
                    cy="200"
                    r={20 + i * 14}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.12"
                  />
                ))}
              </svg>
            </div>

            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-indigo-700/60 p-2 ring-1 ring-white/10">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-xs uppercase tracking-wider text-indigo-200">
                  Admin Paneli
                </span>
              </div>
              <div className="mt-6 text-xl leading-snug text-indigo-50/95">
                Randevularını, personelini
                <br /> tek ekrandan yönet
              </div>
              <motion.div
                className="absolute right-6 top-6 h-12 w-12 rounded-full bg-indigo-600/40"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(99,102,241,0.35)",
                    "0 0 0 16px rgba(99,102,241,0)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* Sektörler kartı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative col-span-1 overflow-hidden rounded-xl bg-gradient-to-b from-violet-400 to-indigo-500 p-6 text-white shadow-lg"
          >
            <div className="pointer-events-none absolute -right-8 -top-10 opacity-70">
              <CalendarOrb />
            </div>
            <div className="relative mt-24 text-sm text-white/90">Sektörler</div>
            <div className="text-xl font-medium leading-snug">
              Her işletmeye
              <br /> özel randevu sayfası
            </div>
          </motion.div>

          {/* Günlük randevu kartı */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-1 rounded-xl bg-white p-6 text-slate-800 shadow-lg ring-1 ring-slate-200"
          >
            <div className="text-sm text-slate-500">Bugünün Randevuları</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight">
              12{" "}
              <span className="align-middle text-sm font-medium text-slate-400">randevu</span>
            </div>
            <div className="mt-1 text-xs text-indigo-600">↑ dün +3 fazla</div>
            <MiniBars />
          </motion.div>

          {/* Özellik rozetleri */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-1 hidden flex-col justify-between gap-3 md:flex"
          >
            {[
              { icon: <Clock className="h-4 w-4" />, text: "7/24 Online Rezervasyon" },
              { icon: <Users className="h-4 w-4" />, text: "Personel Yönetimi" },
              { icon: <BarChart3 className="h-4 w-4" />, text: "Gelir Takibi" },
            ].map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  {f.icon}
                </div>
                <span className="text-sm font-medium text-slate-800">{f.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <footer className="mx-auto w-full max-w-[1180px] px-4 pb-10 text-center text-xs text-slate-400 md:px-0">
        © {new Date().getFullYear()} hemenrandevum. Online Randevu Sistemi.
      </footer>
    </div>
  );
}
