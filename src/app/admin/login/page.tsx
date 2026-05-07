import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/admin");
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-6">
      <LoginForm />
    </main>
  );
}
