import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password as string | undefined;
  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: "Şifre hatalı" }, { status: 401 });
  }
  setAuthCookie();
  return NextResponse.json({ ok: true });
}
