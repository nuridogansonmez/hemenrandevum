"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  leaves: string[]; // YYYY-MM-DD list
}

interface Props {
  salonId: string;
  initialStaff: StaffMember[];
}

const DAYS_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

function formatDateValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDateLabel(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${TR_MONTHS[m - 1]} ${y}`;
}

export function StaffTab({ salonId, initialStaff }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [leaveStaffId, setLeaveStaffId] = useState<string | null>(null);
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");

  function toggleDay(d: number) {
    setWorkingDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b));
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || workingDays.length === 0) {
      setFormError("İsim ve en az bir çalışma günü zorunludur.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, name: name.trim(), workingDays, startTime, endTime }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error ?? "Hata oluştu");
        return;
      }
      setStaff((prev) => [...prev, { ...data.staff, isActive: true, leaves: [] }]);
      setName("");
      setWorkingDays([1, 2, 3, 4, 5, 6]);
      setStartTime("10:00");
      setEndTime("19:00");
      setShowForm(false);
      startTransition(() => router.refresh());
    } catch {
      setFormError("Bağlantı hatası");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteStaff(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data?.error ?? "Silinemedi");
        return;
      }
      setStaff((prev) => prev.filter((s) => s.id !== id));
      startTransition(() => router.refresh());
    } catch {
      setDeleteError("Bağlantı hatası");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (res.ok) {
        setStaff((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !current } : s));
        startTransition(() => router.refresh());
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function addLeave(staffId: string) {
    if (!leaveDate) return;
    setLeaveSubmitting(true);
    setLeaveError(null);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: leaveDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeaveError(data?.error ?? "Hata oluştu");
        return;
      }
      setStaff((prev) => prev.map((s) =>
        s.id === staffId && !s.leaves.includes(leaveDate)
          ? { ...s, leaves: [...s.leaves, leaveDate].sort() }
          : s,
      ));
      setLeaveDate("");
    } catch {
      setLeaveError("Bağlantı hatası");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  async function removeLeave(staffId: string, date: string) {
    try {
      await fetch(`/api/admin/staff/${staffId}/leave`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      setStaff((prev) => prev.map((s) =>
        s.id === staffId ? { ...s, leaves: s.leaves.filter((d) => d !== date) } : s,
      ));
    } catch {
      // ignore
    }
  }

  const today = formatDateValue(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Personel Yönetimi</h2>
          <p className="text-sm text-gray-500">{staff.filter(s => s.isActive).length} aktif personel</p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(null); }}
          className="btn-primary"
        >
          {showForm ? "Vazgeç" : "+ Yeni Personel"}
        </button>
      </div>

      {deleteError && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={addStaff} className="rounded-2xl border border-indigo-600/20 bg-indigo-50/30 p-6">
          <h3 className="mb-4 font-bold">Yeni Personel Ekle</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">İsim Soyisim</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Ayşe Kaya"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Çalışma Günleri</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      workingDays.includes(d)
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-indigo-600"
                    }`}
                  >
                    {DAYS_SHORT[d]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Başlangıç Saati</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Bitiş Saati</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          {formError && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          )}
          <div className="mt-4 flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Ekleniyor…" : "Personeli Ekle"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              İptal
            </button>
          </div>
        </form>
      )}

      {/* Staff list */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => {
          const activeDays = s.workingHours.map((wh) => wh.dayOfWeek);
          const baseHours = s.workingHours[0];
          const isLeaveOpen = leaveStaffId === s.id;
          const futureLeaves = s.leaves.filter((d) => d >= today);

          return (
            <div key={s.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition ${s.isActive ? "border-gray-200" : "border-gray-200 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white ${s.isActive ? "bg-gradient-to-br from-indigo-600 to-indigo-400" : "bg-gray-400"}`}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-bold">
                      {s.name}
                      {!s.isActive && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Pasif</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{s.appointmentCount} toplam randevu</div>
                  </div>
                </div>
                <button
                  onClick={() => deleteStaff(s.id)}
                  disabled={deletingId === s.id || isPending}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Personeli sil"
                >
                  {deletingId === s.id ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Çalışma Günleri</div>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <span
                      key={d}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                        activeDays.includes(d)
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {DAYS_SHORT[d]}
                    </span>
                  ))}
                </div>
              </div>

              {baseHours && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {baseHours.startTime} – {baseHours.endTime}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => toggleActive(s.id, s.isActive)}
                  disabled={togglingId === s.id}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                    s.isActive
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  } disabled:opacity-50`}
                >
                  {togglingId === s.id ? "…" : s.isActive ? "Pasife Al" : "Aktive Et"}
                </button>
                <button
                  onClick={() => {
                    setLeaveStaffId(isLeaveOpen ? null : s.id);
                    setLeaveDate("");
                    setLeaveError(null);
                  }}
                  className="flex-1 rounded-xl bg-blue-50 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  {isLeaveOpen ? "Kapat" : "İzin Ekle"}
                </button>
              </div>

              {/* Leave panel */}
              {isLeaveOpen && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={leaveDate}
                      min={today}
                      onChange={(e) => setLeaveDate(e.target.value)}
                      className="input-field flex-1 text-xs"
                    />
                    <button
                      onClick={() => addLeave(s.id)}
                      disabled={!leaveDate || leaveSubmitting}
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {leaveSubmitting ? "…" : "Ekle"}
                    </button>
                  </div>
                  {leaveError && <p className="mt-1.5 text-xs text-red-600">{leaveError}</p>}
                  {futureLeaves.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-blue-600">Planlı İzinler</div>
                      {futureLeaves.map((d) => (
                        <div key={d} className="flex items-center justify-between rounded-lg bg-white px-2 py-1">
                          <span className="text-xs text-gray-700">{formatDateLabel(d)}</span>
                          <button
                            onClick={() => removeLeave(s.id, d)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {staff.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500">
          Henüz personel eklenmemiş. Yukarıdaki butona tıklayın.
        </div>
      )}
    </div>
  );
}
