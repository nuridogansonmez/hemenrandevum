import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const leaves = await prisma.staffLeave.findMany({
    where: { staffId: params.id },
    orderBy: { date: "asc" },
    select: { id: true, date: true },
  });

  return NextResponse.json({
    leaves: leaves.map((l) => ({ id: l.id, date: l.date.toISOString().slice(0, 10) })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }

  const leave = await prisma.staffLeave.upsert({
    where: { staffId_date: { staffId: params.id, date: parseDateOnly(parsed.data.date) } },
    update: {},
    create: { staffId: params.id, date: parseDateOnly(parsed.data.date) },
  });

  return NextResponse.json({ id: leave.id, date: parsed.data.date });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  }

  await prisma.staffLeave.deleteMany({
    where: { staffId: params.id, date: parseDateOnly(parsed.data.date) },
  });

  return NextResponse.json({ ok: true });
}
