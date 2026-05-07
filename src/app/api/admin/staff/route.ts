import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

const createSchema = z.object({
  salonId: z.string().min(1),
  name: z.string().min(2).max(50),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const salonId = req.nextUrl.searchParams.get("salonId");
  if (!salonId) return NextResponse.json({ error: "salonId required" }, { status: 400 });

  const staff = await prisma.staff.findMany({
    where: { salonId },
    orderBy: { name: "asc" },
    include: {
      workingHours: { orderBy: { dayOfWeek: "asc" } },
      _count: { select: { appointments: { where: { status: { not: "cancelled" } } } } },
    },
  });

  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz bilgiler", details: parsed.error.flatten() }, { status: 400 });
  }
  const { salonId, name, workingDays, startTime, endTime } = parsed.data;

  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
  if (!salon) return NextResponse.json({ error: "Salon bulunamadı" }, { status: 404 });

  const staff = await prisma.staff.create({
    data: {
      salonId,
      name,
      workingHours: {
        create: workingDays.map((day) => ({
          dayOfWeek: day,
          startTime,
          endTime,
        })),
      },
    },
    include: { workingHours: true, _count: { select: { appointments: true } } },
  });

  return NextResponse.json({ staff });
}
