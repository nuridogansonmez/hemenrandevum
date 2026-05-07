"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface StaffMember {
  id: string;
  name: string;
  isActive: boolean;
}

interface Slot {
  time: string;
  available: boolean;
}

interface Props {
  salonId: string;
  salonSlug: string;
  services: Service[];
  staff: StaffMember[];
}

const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const TR_DAYS_SHORT = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

function formatDateValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDateLabel(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${TR_MONTHS[m - 1]} ${y}`;
}
function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}

export function AdminBookingTab({ salonId, salonSlug, services, staff }: Props) {
  const router = useRouter();
  const activeStaff = staff.filter((s) => s.isActive);

  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("any");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  useEffect(() => {
    if (!selectedDate || !serviceId) { setSlots([]); return; }
    let cancelled = false;
    setSlotsLoading(true);
    setSlots([]);
    fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: salonSlug, staffId, date: selectedDate, serviceIds: [serviceId] }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setSlots(data.slots ?? []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, serviceId, staffId, salonSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId || !selectedDate || !selectedTime || !customerName.trim() || !customerPhone.trim()) {
      setError("Tüm alanları doldurun.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: salonSlug,
          serviceIds: [serviceId],
          staffId,
          date: selectedDate,
          time: selectedTime,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Randevu oluşturulamadı.");
        if (res.status === 409) setSelectedTime("");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setServiceId(""); setStaffId("any");
    setSelectedDate(""); setSelectedTime("");
    setCustomerName(""); setCustomerPhone("");
    setSlots([]); setError(null); setSuccess(false);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-green-800">Randevu Oluşturuldu!</h3>
        <p className="mt-2 text-sm text-green-700">
          {customerName} · {formatDateLabel(selectedDate)} {selectedTime} · {selectedService?.name}
        </p>
        <button onClick={resetForm} className="btn-primary mt-6">
          Yeni Randevu Ekle
        </button>
      </div>
    );
  }

  const today = startOfDay(new Date());
  const year = calendarMonth.getFullYear();
  const m = calendarMonth.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const canGoBack = !(year === today.getFullYear() && m === today.getMonth());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Manuel Randevu Ekle</h2>
        <p className="text-sm text-gray-500">Müşteri adına direkt olarak randevu oluşturun.</p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        {/* Left: service + staff + customer */}
        <div className="space-y-5">
          {/* Service */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Hizmet</label>
            <div className="space-y-2">
              {services.map((s) => {
                const sel = serviceId === s.id;
                return (
                  <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${sel ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-600/40"}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`h-4 w-4 rounded-full border-2 transition ${sel ? "border-indigo-600 bg-indigo-600" : "border-gray-300"}`}>
                        {sel && <div className="m-0.5 h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.durationMinutes} dk</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{s.price} ₺</span>
                    <input type="radio" className="sr-only" value={s.id} checked={sel} onChange={() => { setServiceId(s.id); setSelectedTime(""); }} />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Staff */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Personel</label>
            <div className="space-y-1.5">
              <label className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${staffId === "any" ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-600/40"}`}>
                <input type="radio" className="accent-indigo-600" value="any" checked={staffId === "any"} onChange={() => { setStaffId("any"); setSelectedTime(""); }} />
                <div>
                  <div className="text-sm font-medium">Fark Etmez</div>
                  <div className="text-xs text-gray-400">Müsait personel atanır</div>
                </div>
              </label>
              {activeStaff.map((s) => (
                <label key={s.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition ${staffId === s.id ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-indigo-600/40"}`}>
                  <input type="radio" className="accent-indigo-600" value={s.id} checked={staffId === s.id} onChange={() => { setStaffId(s.id); setSelectedTime(""); }} />
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                    {s.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{s.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Customer */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Müşteri Bilgileri</label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Ad Soyad"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field"
              />
              <input
                type="tel"
                placeholder="Telefon Numarası"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Right: calendar + time slots */}
        <div className="space-y-5">
          {/* Calendar */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Tarih</label>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(year, m - 1, 1))}
                  disabled={!canGoBack}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="font-semibold text-sm">{TR_MONTHS[m]} {year}</span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(year, m + 1, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="mb-1 grid grid-cols-7 text-center">
                {TR_DAYS_SHORT.map((d) => (
                  <div key={d} className="py-1 text-[10px] font-medium text-gray-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} />;
                  const value = formatDateValue(date);
                  const isPast = date < today;
                  const isSel = selectedDate === value;
                  const isToday = date.getTime() === today.getTime();
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isPast}
                      onClick={() => { setSelectedDate(value); setSelectedTime(""); }}
                      className={`aspect-square rounded-lg text-xs font-medium transition ${
                        isSel ? "bg-indigo-600 text-white" :
                        isPast ? "cursor-not-allowed text-gray-300" :
                        isToday ? "ring-2 ring-indigo-600 text-indigo-600 font-bold hover:bg-indigo-50" :
                        "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && serviceId && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Saat — {formatDateLabel(selectedDate)}
              </label>
              {slotsLoading ? (
                <div className="rounded-xl bg-gray-50 py-6 text-center text-sm text-gray-400">Saatler yükleniyor…</div>
              ) : slots.length === 0 ? (
                <div className="rounded-xl bg-gray-50 py-6 text-center text-sm text-gray-500">Bu tarihte müsait saat yok.</div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((slot) => {
                    const sel = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`rounded-xl py-2 text-xs font-medium transition ${
                          sel ? "bg-indigo-600 text-white shadow-sm" :
                          slot.available ? "bg-white text-gray-800 ring-1 ring-gray-200 hover:ring-indigo-600 hover:text-indigo-600" :
                          "cursor-not-allowed bg-gray-50 text-gray-300 line-through"
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Summary + submit */}
          {serviceId && selectedDate && selectedTime && (
            <div className="rounded-2xl border border-indigo-600/20 bg-indigo-50/30 p-4 text-sm">
              <div className="space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Hizmet</span><span className="font-medium">{selectedService?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Personel</span><span className="font-medium">{staffId === "any" ? "Fark Etmez" : activeStaff.find(s => s.id === staffId)?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tarih · Saat</span><span className="font-medium">{formatDateLabel(selectedDate)} · {selectedTime}</span></div>
                <div className="flex justify-between border-t border-indigo-600/20 pt-1.5"><span className="text-gray-500">Tutar</span><span className="font-bold text-indigo-600">{selectedService?.price} ₺</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Error + submit button spans full width */}
        <div className="lg:col-span-2">
          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <button
            type="submit"
            disabled={submitting || !serviceId || !selectedDate || !selectedTime || !customerName || !customerPhone}
            className="btn-primary w-full"
          >
            {submitting ? "Oluşturuluyor…" : "Randevuyu Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
