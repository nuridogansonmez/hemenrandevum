import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeSlots } from "@/lib/slots";

const querySchema = z.object({
  slug: z.string().min(1),
  staffId: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceIds: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { slug, staffId, date, serviceIds } = parsed.data;

  const salon = await prisma.salon.findUnique({ where: { slug }, select: { id: true } });
  if (!salon) return NextResponse.json({ error: "salon not found" }, { status: 404 });

  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, salonId: salon.id },
    select: { id: true, durationMinutes: true },
  });
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ error: "invalid service" }, { status: 400 });
  }

  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

  const slots = await computeSlots({
    salonId: salon.id,
    staffId: staffId && staffId !== "any" ? staffId : null,
    date,
    totalDurationMinutes: totalDuration,
  });

  return NextResponse.json({ slots, totalDuration });
}
