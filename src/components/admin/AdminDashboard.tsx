"use client";

import { useMemo } from "react";

type Status = "pending" | "confirmed" | "cancelled";

interface Appointment {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  customerName: string;
  serviceName: string;
  servicePrice: number;
  staffName: string;
  status: Status;
  noShow: boolean;
  actualAmount: number | null;
  isToday: boolean;
}

interface Props {
  appointments: Appointment[];
}

function utcToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOfWeek() {
  const d = new Date();
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function formatDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${TR_MONTHS_SHORT[m - 1]}`;
}

// Actual revenue: use actualAmount if set, fallback to servicePrice
function effectiveRevenue(a: Appointment) {
  return a.actualAmount !== null ? a.actualAmount : a.servicePrice;
}

export function AdminDashboard({ appointments }: Props) {
  const today = utcToday();
  const weekStart = mondayOfWeek();
  const monthStart = firstOfMonth();

  const stats = useMemo(() => {
    const active = appointments.filter((a) => a.status !== "cancelled" && !a.noShow);
    const attended = appointments.filter((a) => a.actualAmount !== null);
    const todayApps = active.filter((a) => a.date === today);
    const weekApps = active.filter((a) => a.date >= weekStart);
    const monthApps = active.filter((a) => a.date >= monthStart);

    // Revenue: only count attended (actualAmount set) appointments this month
    const monthAttended = attended.filter((a) => a.date >= monthStart);
    const monthRevenue = monthAttended.reduce((sum, a) => sum + effectiveRevenue(a), 0);

    // Staff stats (this month, active)
    const staffMap = new Map<string, number>();
    for (const a of monthApps) {
      staffMap.set(a.staffName, (staffMap.get(a.staffName) ?? 0) + 1);
    }
    const staffStats = Array.from(staffMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Service stats (this month — based on attended with actual amounts)
    const serviceMap = new Map<string, { count: number; revenue: number }>();
    for (const a of monthAttended) {
      const e = serviceMap.get(a.serviceName) ?? { count: 0, revenue: 0 };
      e.count++;
      e.revenue += effectiveRevenue(a);
      serviceMap.set(a.serviceName, e);
    }
    const serviceStats = Array.from(serviceMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    // Last 7 days chart data (active appointments)
    const days: { label: string; date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ label: formatDate(ds), date: ds, count: active.filter((a) => a.date === ds).length });
    }

    return {
      today: todayApps.length,
      week: weekApps.length,
      month: monthApps.length,
      monthRevenue,
      staffStats,
      serviceStats,
      days,
    };
  }, [appointments, today, weekStart, monthStart]);

  const maxDay = Math.max(...stats.days.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Bugün" value={stats.today} sub="aktif randevu" color="pink" icon="📅" />
        <KpiCard label="Bu Hafta" value={stats.week} sub="aktif randevu" color="blue" icon="📆" />
        <KpiCard label="Bu Ay" value={stats.month} sub="aktif randevu" color="green" icon="🗓️" />
        <KpiCard label="Bu Ay Gelir" value={stats.monthRevenue} sub="₺ (alınan)" color="amber" icon="💰" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Son 7 Gün */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-bold">Son 7 Gün</h3>
          <div className="flex items-end gap-2">
            {stats.days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-indigo-600">
                  {d.count > 0 ? d.count : ""}
                </span>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    d.date === today ? "bg-indigo-600" : "bg-indigo-600/30"
                  }`}
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 80)}px` }}
                />
                <span className="text-[10px] text-gray-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Personel Yoğunluğu */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-bold">
            Personel Yoğunluğu{" "}
            <span className="font-normal text-xs text-gray-500">(bu ay)</span>
          </h3>
          {stats.staffStats.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz veri yok.</p>
          ) : (
            <div className="space-y-3">
              {stats.staffStats.map((s, i) => {
                const max = stats.staffStats[0].count;
                return (
                  <div key={s.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        {i === 0 && <span className="text-amber-500">🏆</span>}
                        {s.name}
                      </span>
                      <span className="text-gray-500">{s.count} randevu</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                        style={{ width: `${(s.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hizmet popülaritesi — gelir bazlı */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-1 font-bold">
          Hizmet Gelirleri{" "}
          <span className="font-normal text-xs text-gray-500">(bu ay · alınan ücret)</span>
        </h3>
        <p className="mb-4 text-xs text-gray-400">Sadece "Geldi" işaretlenmiş randevular dahildir.</p>
        {stats.serviceStats.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz veri yok.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.serviceStats.map((s, i) => (
              <div
                key={s.name}
                className={`rounded-xl p-4 ${i === 0 ? "bg-indigo-50 border border-indigo-600/20" : "bg-gray-50"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.name}</span>
                  {i === 0 && <span className="text-amber-500 text-sm">⭐</span>}
                </div>
                <div className="mt-2 text-2xl font-extrabold text-indigo-600">
                  {s.revenue.toLocaleString("tr-TR")} ₺
                </div>
                <div className="text-xs text-gray-500">{s.count} randevu</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string;
  value: number;
  sub: string;
  color: "pink" | "blue" | "green" | "amber";
  icon: string;
}) {
  const colors = {
    pink: "from-indigo-600/10 to-rose-50 border-indigo-600/20",
    blue: "from-blue-50 to-indigo-50 border-blue-200",
    green: "from-green-50 to-emerald-50 border-green-600/30",
    amber: "from-amber-50 to-orange-50 border-amber-200",
  };
  const textColors = {
    pink: "text-indigo-600",
    blue: "text-blue-600",
    green: "text-green-700",
    amber: "text-amber-700",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${colors[color]} p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`mt-2 text-4xl font-extrabold ${textColors[color]}`}>
        {value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : value}
      </div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}
