"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "pending" | "confirmed" | "cancelled";

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
  status: Status;
  noShow: boolean;
  actualAmount: number | null;
  isToday: boolean;
  isPast: boolean;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface Props {
  appointments: Appointment[];
  services: Service[];
}

const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function formatDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${TR_MONTHS_SHORT[m - 1]} ${y}`;
}

export function AppointmentsTab({ appointments, services }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "noshow" | "cancelled">("all");

  // attended modal state
  const [attendedId, setAttendedId] = useState<string | null>(null);
  const [attendedAmount, setAttendedAmount] = useState<string>("");
  const [attendedServiceId, setAttendedServiceId] = useState<string>("");
  const [attendedError, setAttendedError] = useState<string | null>(null);

  const todayApps = appointments.filter((a) => a.isToday && a.status !== "cancelled");

  const filtered =
    filter === "all" ? appointments :
    filter === "active" ? appointments.filter((a) => a.status !== "cancelled" && !a.noShow) :
    filter === "noshow" ? appointments.filter((a) => a.noShow) :
    appointments.filter((a) => a.status === "cancelled");

  const activeCount = appointments.filter((a) => a.status !== "cancelled" && !a.noShow).length;
  const noshowCount = appointments.filter((a) => a.noShow).length;
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;

  function openAttendedModal(a: Appointment) {
    setAttendedId(a.id);
    setAttendedAmount(String(a.servicePrice));
    // pre-select the booked service if it exists in services list, else empty
    const match = services.find((s) => s.name === a.serviceName);
    setAttendedServiceId(match?.id ?? "");
    setAttendedError(null);
  }

  function handleServiceChange(serviceId: string) {
    setAttendedServiceId(serviceId);
    const svc = services.find((s) => s.id === serviceId);
    if (svc) setAttendedAmount(String(svc.price));
  }

  async function cancelAppointment(id: string) {
    setUpdatingId(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setUpdatingId(null);
    startTransition(() => router.refresh());
  }

  async function markNoShow(id: string) {
    setUpdatingId(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "noshow" }),
    });
    setUpdatingId(null);
    startTransition(() => router.refresh());
  }

  async function undoAction(id: string, action: "unattend" | "unnoshow" | "uncancel") {
    setUpdatingId(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setUpdatingId(null);
    startTransition(() => router.refresh());
  }

  async function markAttended() {
    if (!attendedId) return;
    const amount = parseInt(attendedAmount, 10);
    if (isNaN(amount) || amount < 0) {
      setAttendedError("Geçerli bir tutar girin.");
      return;
    }
    setUpdatingId(attendedId);
    setAttendedError(null);
    const body: Record<string, unknown> = { action: "attended", actualAmount: amount };
    if (attendedServiceId) body.serviceId = attendedServiceId;
    await fetch(`/api/appointments/${attendedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAttendedId(null);
    setAttendedAmount("");
    setAttendedServiceId("");
    setUpdatingId(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {/* Attended modal */}
      {attendedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-lg font-bold">Müşteri Geldi</h3>
            <p className="mb-4 text-sm text-gray-500">Verilen hizmeti ve alınan ücreti girin.</p>

            {/* Service selector */}
            <label className="mb-1 block text-xs font-medium text-gray-600">Verilen Hizmet</label>
            <select
              value={attendedServiceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="input-field mb-3 w-full"
            >
              <option value="">— Hizmet seçin —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.price} ₺)
                </option>
              ))}
            </select>

            {/* Amount input */}
            <label className="mb-1 block text-xs font-medium text-gray-600">Alınan Ücret</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={attendedAmount}
                onChange={(e) => setAttendedAmount(e.target.value)}
                className="input-field flex-1"
                autoFocus
              />
              <span className="text-sm font-medium text-gray-500">₺</span>
            </div>

            {attendedError && <p className="mt-1.5 text-xs text-red-600">{attendedError}</p>}

            <div className="mt-4 flex gap-2">
              <button
                onClick={markAttended}
                disabled={!!updatingId}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {updatingId ? "Kaydediliyor…" : "Kaydet"}
              </button>
              <button
                onClick={() => { setAttendedId(null); setAttendedAmount(""); setAttendedServiceId(""); setAttendedError(null); }}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today highlight */}
      {todayApps.length > 0 && (
        <div className="rounded-2xl border border-indigo-600/30 bg-indigo-50/40 p-5">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-indigo-700">
            <span>📅</span> Bugünün Randevuları ({todayApps.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {todayApps.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                <div>
                  <div className="font-semibold text-sm">{a.time} — {a.customerName}</div>
                  <div className="text-xs text-gray-500">{a.serviceName} · {a.staffName}</div>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Aktif</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: "all", label: "Tümü", count: appointments.length },
          { key: "active", label: "Aktif", count: activeCount },
          { key: "noshow", label: "Gelmedi", count: noshowCount },
          { key: "cancelled", label: "İptal", count: cancelledCount },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === f.key ? "bg-indigo-600 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-indigo-600"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">Bu filtreye uygun randevu yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tarih · Saat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Hizmet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Durum</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => {
                  const canMark = a.status !== "cancelled" && !a.noShow && a.actualAmount === null;
                  return (
                    <tr key={a.id} className={`transition hover:bg-gray-50 ${a.isToday ? "bg-indigo-50/20" : ""} ${a.noShow ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{formatDate(a.date)}</div>
                        <div className="text-xs text-gray-500">{a.time} · {a.durationMinutes} dk</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{a.customerName}</div>
                        <a href={`tel:${a.customerPhone}`} className="text-xs text-indigo-600 hover:underline">{a.customerPhone}</a>
                      </td>
                      <td className="px-4 py-3">
                        <div>{a.serviceName}</div>
                        <div className="text-xs font-semibold text-indigo-600">
                          {a.actualAmount !== null ? (
                            <span className="text-green-700">{a.actualAmount} ₺ <span className="font-normal text-gray-400">(alınan)</span></span>
                          ) : (
                            `${a.servicePrice} ₺`
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{a.staffName}</td>
                      <td className="px-4 py-3">
                        {a.noShow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                            ✗ Gelmedi
                          </span>
                        ) : a.actualAmount !== null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                            ✓ Geldi
                          </span>
                        ) : a.status === "cancelled" ? (
                          <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">İptal</span>
                        ) : (
                          <span className="inline-block rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">Aktif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {canMark && (
                            <>
                              <button
                                onClick={() => openAttendedModal(a)}
                                disabled={isPending || updatingId === a.id}
                                className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 transition hover:bg-green-200 disabled:opacity-50"
                              >
                                Geldi
                              </button>
                              <button
                                onClick={() => markNoShow(a.id)}
                                disabled={isPending || updatingId === a.id}
                                className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                              >
                                {updatingId === a.id ? "…" : "Gelmedi"}
                              </button>
                            </>
                          )}
                          {/* Geldi → Düzelt (reopen modal) or Geri Al */}
                          {a.actualAmount !== null && !a.noShow && (
                            <>
                              <button
                                onClick={() => openAttendedModal(a)}
                                disabled={isPending || updatingId === a.id}
                                className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                              >
                                Düzelt
                              </button>
                              <button
                                onClick={() => undoAction(a.id, "unattend")}
                                disabled={isPending || updatingId === a.id}
                                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
                              >
                                {updatingId === a.id ? "…" : "↩"}
                              </button>
                            </>
                          )}
                          {/* Gelmedi → Geri Al */}
                          {a.noShow && (
                            <button
                              onClick={() => undoAction(a.id, "unnoshow")}
                              disabled={isPending || updatingId === a.id}
                              className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                            >
                              {updatingId === a.id ? "…" : "Geri Al"}
                            </button>
                          )}
                          {/* İptal → Geri Al */}
                          {a.status === "cancelled" && (
                            <button
                              onClick={() => undoAction(a.id, "uncancel")}
                              disabled={isPending || updatingId === a.id}
                              className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                            >
                              {updatingId === a.id ? "…" : "Geri Al"}
                            </button>
                          )}
                          {/* İptal butonu — sadece aktif randevularda */}
                          {a.status !== "cancelled" && !a.noShow && a.actualAmount === null && (
                            <button
                              onClick={() => cancelAppointment(a.id)}
                              disabled={isPending || updatingId === a.id}
                              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                            >
                              İptal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
