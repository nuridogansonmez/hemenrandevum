"use client";

import { useEffect, useMemo, useState } from "react";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}

interface Staff {
  id: string;
  name: string;
}

interface Slot {
  time: string;
  available: boolean;
  availableStaffIds: string[];
}

interface Props {
  slug: string;
  services: Service[];
  staff: Staff[];
}

type Step = 1 | 2 | 3 | 4 | 5;

const TR_MONTHS = [
  "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
  "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık",
];
const TR_DAYS_SHORT = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];

function formatDateValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDateLabel(d: Date) {
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

const STEP_LABELS = ["Hizmet","Personel","Tarih","Saat","Bilgiler"];

export function AppointmentWidget({ slug, services, staff }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
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
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ id: string } | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );
  const totalDuration = selectedService?.durationMinutes ?? 0;
  const totalPrice = selectedService?.price ?? 0;

  useEffect(() => {
    if (step !== 4 || !selectedDate || !selectedServiceId) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlots([]);
    fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, staffId, date: selectedDate, serviceIds: [selectedServiceId] }),
    })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setSlots(data.slots ?? []); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [step, slug, staffId, selectedDate, selectedServiceId]);

  function goNext() { setError(null); setStep((s) => Math.min(5, s + 1) as Step); }
  function goBack()  { setError(null); setStep((s) => Math.max(1, s - 1) as Step); }

  async function submit() {
    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Lütfen ad soyad ve telefon bilgilerini girin.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug, serviceIds: [selectedServiceId], staffId,
          date: selectedDate, time: selectedTime,
          customerName: customerName.trim(), customerPhone: customerPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data?.error === "BLOCKED") {
          setBlockedMessage(data.message);
          return;
        }
        setError(data?.error ?? "Randevu oluşturulamadı.");
        if (res.status === 409) { setSelectedTime(""); setStep(4); }
        return;
      }
      setConfirmation({ id: data.id });
    } catch {
      setError("Bağlantı hatası, lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setStep(1); setSelectedServiceId(null); setStaffId("any");
    setSelectedDate(""); setSelectedTime("");
    setCustomerName(""); setCustomerPhone("");
    setError(null); setConfirmation(null); setBlockedMessage(null);
  }

  const canProceed =
    step === 1 ? !!selectedServiceId :
    step === 2 ? !!staffId :
    step === 3 ? !!selectedDate :
    step === 4 ? !!selectedTime :
    (!!customerName.trim() && !!customerPhone.trim());

  /* ── Blocked screen ── */
  if (blockedMessage) {
    return (
      <div className="rounded-3xl border border-red-100 bg-white p-8 shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h3 className="font-sans mt-5 text-center text-xl font-bold text-ink">Randevu Alınamıyor</h3>
        <p className="mt-3 text-center text-sm text-ink-secondary leading-relaxed">{blockedMessage}</p>
        <button onClick={resetAll} className="btn-outline mt-6 w-full">Geri Dön</button>
      </div>
    );
  }

  /* ── Confirmation screen ── */
  if (confirmation) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
          <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-sans mt-5 text-center text-xl font-bold text-ink">Randevunuz Alındı!</h3>
        <p className="mt-2 text-center text-sm text-ink-secondary">
          En kısa sürede sizinle iletişime geçeceğiz.
        </p>
        <div className="mt-6 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
          <Row label="Tarih" value={formatDateLabel(new Date(selectedDate))} />
          <Row label="Saat" value={selectedTime} />
          <Row label="Süre" value={`${totalDuration} dk`} />
          <div className="border-t border-gray-200 pt-2">
            <Row label="Toplam" value={`${totalPrice} ₺`} bold pink />
          </div>
        </div>
        <button onClick={resetAll} className="btn-outline mt-5 w-full">Yeni Randevu</button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card">
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <h2 className="font-sans font-bold text-ink">Randevu Al</h2>
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600">
            {STEP_LABELS[step - 1]}
          </span>
        </div>
        {/* Progress dots */}
        <div className="mt-4 flex gap-1.5">
          {[1,2,3,4,5].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                n <= step ? "bg-indigo-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 py-5">

        {/* ── Step 1: Services ── */}
        {step === 1 && (
          <div>
            <p className="mb-3 text-sm text-ink-secondary">Almak istediğiniz hizmeti seçin.</p>

            {/* Scrollable service grid */}
            <div className="relative">
              <div className="max-h-[260px] overflow-y-auto pr-0.5 [scrollbar-width:thin] [scrollbar-color:#a5b4fc_transparent]">
                <div className="grid grid-cols-2 gap-2">
                  {services.map((s) => {
                    const selected = selectedServiceId === s.id;
                    return (
                      <label
                        key={s.id}
                        className={`relative flex cursor-pointer flex-col rounded-2xl border p-3 transition ${
                          selected
                            ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-300"
                            : "border-gray-100 bg-white hover:border-indigo-400 hover:bg-indigo-50/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="service"
                          value={s.id}
                          checked={selected}
                          onChange={() => setSelectedServiceId(s.id)}
                          className="sr-only"
                        />
                        {/* Selected indicator */}
                        {selected && (
                          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600">
                            <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <span className="text-[13px] font-semibold leading-snug text-ink pr-4">{s.name}</span>
                        <span className="mt-1.5 text-xs text-ink-tertiary">{s.durationMinutes} dk</span>
                        <span className="mt-1 text-sm font-bold text-indigo-600">{s.price} ₺</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {/* Bottom fade hint when list is long */}
              {services.length > 4 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
              )}
            </div>

            {/* Selected summary bar */}
            {selectedService ? (
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-indigo-100 px-4 py-2.5 text-sm">
                <span className="font-semibold text-indigo-600">{selectedService.name}</span>
                <div className="flex items-center gap-3 text-indigo-600">
                  <span>{totalDuration} dk</span>
                  <span className="font-bold">{totalPrice} ₺</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-gray-200 px-4 py-2.5 text-center text-xs text-ink-tertiary">
                Bir hizmet seçin
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Staff ── */}
        {step === 2 && (
          <div>
            <p className="mb-4 text-sm text-ink-secondary">Tercih etmediğinizde "Fark Etmez" seçebilirsiniz.</p>
            <div className="space-y-2">
              <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
                staffId === "any" ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:border-indigo-400"
              }`}>
                <input type="radio" name="staff" value="any" checked={staffId === "any"} onChange={() => setStaffId("any")} className="accent-indigo-600" />
                <div>
                  <div className="text-sm font-semibold text-ink">Fark Etmez</div>
                  <div className="text-xs text-ink-tertiary">Müsait olan personel atanır</div>
                </div>
              </label>
              {staff.map((s) => (
                <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
                  staffId === s.id ? "border-indigo-600 bg-indigo-50" : "border-gray-100 hover:border-indigo-400"
                }`}>
                  <input type="radio" name="staff" value={s.id} checked={staffId === s.id} onChange={() => setStaffId(s.id)} className="accent-indigo-600" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                    {s.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-ink">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Calendar ── */}
        {step === 3 && (
          <CalendarStep
            month={calendarMonth}
            setMonth={setCalendarMonth}
            selected={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); }}
          />
        )}

        {/* ── Step 4: Time slots ── */}
        {step === 4 && (
          <div>
            <p className="mb-4 text-sm text-ink-secondary">
              {formatDateLabel(new Date(selectedDate))} · {totalDuration} dk
            </p>
            {slotsLoading ? (
              <div className="py-10 text-center text-sm text-ink-tertiary">Saatler yükleniyor…</div>
            ) : slots.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-ink-secondary">
                Bu tarihte müsait saat yok. Başka bir tarih deneyin.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const sel = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-xl py-2.5 text-sm font-medium transition ${
                        sel
                          ? "bg-indigo-600 text-white shadow-sm"
                          : slot.available
                          ? "bg-white text-ink ring-1 ring-gray-200 hover:ring-indigo-500 hover:text-indigo-600"
                          : "cursor-not-allowed bg-gray-50 text-gray-300 line-through"
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

        {/* ── Step 5: Customer info ── */}
        {step === 5 && (
          <div>
            <p className="mb-4 text-sm text-ink-secondary">
              Bilgilerinizi girin, randevuyu onaylayın.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ad Soyad"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input-field"
              />
              <input
                type="tel"
                placeholder="Telefon Numarası (05xx...)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input-field"
              />
            </div>
            {/* Summary */}
            <div className="mt-5 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm">
              <Row label="Hizmet" value={selectedService?.name ?? ""} />
              <Row
                label="Personel"
                value={staffId === "any" ? "Fark Etmez" : staff.find((s) => s.id === staffId)?.name ?? ""}
              />
              <Row label="Tarih · Saat" value={`${formatDateLabel(new Date(selectedDate))} · ${selectedTime}`} />
              <div className="border-t border-gray-200 pt-2">
                <Row label="Toplam" value={`${totalPrice} ₺`} bold pink />
              </div>
            </div>
          </div>
        )}


        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
        {step > 1 ? (
          <button onClick={goBack} disabled={submitting} className="btn-ghost text-sm">
            ← Geri
          </button>
        ) : <span />}

        {step < 5 && (
          <button onClick={goNext} disabled={!canProceed} className="btn-primary text-sm px-6 py-2.5">
            Devam Et
          </button>
        )}

        {step === 5 && (
          <button
            onClick={submit}
            disabled={submitting || !customerName.trim() || !customerPhone.trim()}
            className="btn-primary text-sm px-6 py-2.5"
          >
            {submitting ? "Gönderiliyor…" : "Randevuyu Onayla →"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, pink }: { label: string; value: string; bold?: boolean; pink?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-tertiary">{label}</span>
      <span className={`text-right ${bold ? "font-bold" : "font-medium"} ${pink ? "text-indigo-600" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function CalendarStep({
  month, setMonth, selected, onSelect,
}: {
  month: Date;
  setMonth: (d: Date) => void;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const today = startOfDay(new Date());
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoBack = !(year === today.getFullYear() && m === today.getMonth());

  return (
    <div>
      <p className="mb-4 text-sm text-ink-secondary">Geçmiş tarihler seçilemez.</p>

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(new Date(year, m - 1, 1))}
          disabled={!canGoBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary transition hover:bg-gray-100 disabled:opacity-30"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-ink">{TR_MONTHS[m]} {year}</span>
        <button
          type="button"
          onClick={() => setMonth(new Date(year, m + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary transition hover:bg-gray-100"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center">
        {TR_DAYS_SHORT.map((d) => (
          <div key={d} className="py-1 text-[11px] font-medium text-ink-tertiary">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const value = formatDateValue(date);
          const isPast = date < today;
          const isSelected = selected === value;
          const isToday = date.getTime() === today.getTime();
          return (
            <button
              key={i}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(value)}
              className={`aspect-square rounded-xl text-sm font-medium transition ${
                isSelected
                  ? "bg-indigo-600 text-white"
                  : isPast
                  ? "cursor-not-allowed text-gray-300"
                  : isToday
                  ? "ring-2 ring-indigo-600 text-indigo-600 font-bold hover:bg-indigo-50"
                  : "text-ink hover:bg-gray-100"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
