"use client";

import { useState } from "react";
import { AdminDashboard } from "./AdminDashboard";
import { AppointmentsTab } from "./AppointmentsTab";
import { StaffTab } from "./StaffTab";
import { AdminBookingTab } from "./AdminBookingTab";
import { BlockedCustomersTab } from "./BlockedCustomersTab";
import { useRouter } from "next/navigation";

type Tab = "dashboard" | "appointments" | "booking" | "staff" | "blocked";

interface Appointment {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  servicePrice: number;
  staffName: string;
  salonName: string;
  status: "pending" | "confirmed" | "cancelled";
  noShow: boolean;
  actualAmount: number | null;
  isToday: boolean;
  isPast: boolean;
}

interface WorkingHour {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface StaffMember {
  id: string;
  name: string;
  isActive: boolean;
  appointmentCount: number;
  workingHours: WorkingHour[];
  leaves: string[];
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface BlockedCustomer {
  id: string;
  name: string;
  phone: string;
  blockedAt: string;
}

interface Props {
  salonId: string;
  salonSlug: string;
  salonName: string;
  appointments: Appointment[];
  staff: StaffMember[];
  services: Service[];
  blockedCustomers: BlockedCustomer[];
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "appointments", label: "Randevular", icon: "📅" },
  { key: "booking", label: "Randevu Ekle", icon: "➕" },
  { key: "staff", label: "Personel", icon: "👥" },
  { key: "blocked", label: "Engelli", icon: "🚫" },
];

export function AdminShell({ salonId, salonSlug, salonName, appointments, staff, services, blockedCustomers }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold leading-tight text-gray-900">{salonName}</div>
              <div className="text-xs text-gray-500">Hemenrandevum Demo Paneli</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/salon/${salonSlug}`}
              target="_blank"
              className="hidden rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 sm:block"
            >
              Siteyi Görüntüle ↗
            </a>
            <button
              onClick={logout}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-medium transition ${
                  tab === t.key
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
                {t.key === "blocked" && blockedCustomers.length > 0 && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {blockedCustomers.length > 9 ? "9+" : blockedCustomers.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {tab === "dashboard" && <AdminDashboard appointments={appointments} />}
        {tab === "appointments" && <AppointmentsTab appointments={appointments} services={services} />}
        {tab === "booking" && (
          <AdminBookingTab salonId={salonId} salonSlug={salonSlug} services={services} staff={staff} />
        )}
        {tab === "staff" && <StaffTab salonId={salonId} initialStaff={staff} />}
        {tab === "blocked" && (
          <BlockedCustomersTab salonId={salonId} initialBlocked={blockedCustomers} />
        )}
      </div>
    </div>
  );
}
