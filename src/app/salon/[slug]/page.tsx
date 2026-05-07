import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppointmentWidget } from "@/components/AppointmentWidget";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export default async function SalonPage({ params }: Props) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    include: {
      services: { orderBy: { price: "asc" } },
      staff: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  if (!salon) notFound();

  const services = salon.services.map((s) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    price: s.price,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900">{salon.name}</div>
              <div className="text-xs text-gray-500">Online Randevu</div>
            </div>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Ana Sayfa
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Business info */}
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
          <h1 className="text-2xl font-bold text-gray-900">{salon.name}</h1>
          {salon.description && (
            <p className="mt-2 text-gray-500">{salon.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            {salon.phone && (
              <a
                href={`tel:${salon.phone}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                {salon.phone}
              </a>
            )}
            {salon.address && (
              <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {salon.address}
              </span>
            )}
          </div>
        </div>

        {/* Appointment widget centered */}
        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Widget: mobilde 1. sıra, masaüstünde sağ kolon */}
          <div className="lg:sticky lg:top-24 lg:h-fit lg:order-2">
            <AppointmentWidget
              slug={salon.slug}
              services={services}
              staff={salon.staff}
            />
          </div>

          {/* Left: How it works — mobilde 2. sıra, masaüstünde sol kolon */}
          <div className="space-y-5 lg:order-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-soft">
              <h3 className="mb-5 text-base font-bold text-gray-900">Nasıl Çalışır?</h3>
              <ol className="space-y-5">
                {[
                  { n: "01", t: "Hizmet Seçin", d: "Almak istediğiniz hizmeti seçin, toplam süreyi görün." },
                  { n: "02", t: "Personel Belirleyin", d: "Tercih ettiğiniz personeli seçin ya da 'Fark Etmez' deyin." },
                  { n: "03", t: "Tarih & Saat", d: "Takvimden tarih, ardından müsait saatlerden birini seçin." },
                  { n: "04", t: "Onaylayın", d: "Ad ve telefon numaranızı girin, randevunuzu gönderin." },
                ].map((step) => (
                  <li key={step.n} className="flex gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                      {step.n}
                    </span>
                    <div className="pt-0.5">
                      <div className="text-sm font-semibold text-gray-900">{step.t}</div>
                      <div className="mt-0.5 text-sm text-gray-500">{step.d}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {salon.phone && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Telefonla Randevu
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Aramayı tercih ediyorsanız:
                </p>
                <a
                  href={`tel:${salon.phone}`}
                  className="mt-3 inline-flex items-center gap-2 text-lg font-bold text-indigo-600 hover:underline"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  {salon.phone}
                </a>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-10 border-t border-gray-100 bg-white px-6 py-6">
        <div className="mx-auto max-w-5xl flex flex-col items-center justify-between gap-2 text-sm text-gray-400 sm:flex-row">
          <span>{salon.name}</span>
          <Link href="/" className="text-indigo-500 hover:underline">hemenrandevum.com</Link>
        </div>
      </footer>
    </div>
  );
}
