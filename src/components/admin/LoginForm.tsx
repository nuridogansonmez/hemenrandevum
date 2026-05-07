"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Giriş başarısız");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-lg ring-1 ring-gray-100"
    >
      <div className="mb-5 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-sm font-bold text-gray-900">hemenrandevum</span>
      </div>
      <h1 className="text-2xl font-bold">Yönetici Girişi</h1>
      <p className="mt-1 text-sm text-gray-500">Devam etmek için şifrenizi girin.</p>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Şifre"
        className="input-field mt-6"
      />
      {error && <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={loading || !password} className="btn-primary mt-5 w-full">
        {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
