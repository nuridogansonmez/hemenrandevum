"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface BlockedCustomer {
  id: string;
  name: string;
  phone: string;
  blockedAt: string;
}

interface Props {
  salonId: string;
  initialBlocked: BlockedCustomer[];
}

const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function formatDate(s: string) {
  const d = new Date(s);
  return `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function BlockedCustomersTab({ salonId, initialBlocked }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [blocked, setBlocked] = useState<BlockedCustomer[]>(initialBlocked);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function unban(id: string) {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/blocked-customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBlocked((prev) => prev.filter((b) => b.id !== id));
        startTransition(() => router.refresh());
      }
    } finally {
      setRemovingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Engelli Müşteriler</h2>
        <p className="text-sm text-gray-500">
          "Gelmedi" işaretlenen müşteriler buraya eklenir. Kapora alındıktan sonra engeli kaldırabilirsiniz.
        </p>
      </div>

      {/* Confirm unban modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold">Engeli Kaldır</h3>
            <p className="mb-5 text-sm text-gray-600">
              Bu müşteri tekrar randevu alabilecek. Kapora alındığından emin misiniz?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => unban(confirmId)}
                disabled={removingId === confirmId}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {removingId === confirmId ? "Kaldırılıyor…" : "Evet, Kaldır"}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {blocked.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <div className="text-3xl">✅</div>
          <p className="mt-3 text-sm text-gray-500">Engelli müşteri yok.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Müşteri</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Telefon</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Engel Tarihi</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {blocked.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                        {b.name.charAt(0)}
                      </div>
                      <span className="font-medium">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a href={`tel:${b.phone}`} className="text-indigo-600 hover:underline">{b.phone}</a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(b.blockedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setConfirmId(b.id)}
                      disabled={isPending || removingId === b.id}
                      className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      Engeli Kaldır
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
