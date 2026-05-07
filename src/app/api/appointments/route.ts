import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeSlots, timeToMinutes } from "@/lib/slots";

const createSchema = z.object({
  slug: z.string().min(1),
  serviceIds: z.array(z.string()).min(1),
  staffId: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(7).max(30),
});

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz form bilgileri" }, { status: 400 });
  }
  const data = parsed.data;

  const salon = await prisma.salon.findUnique({
    where: { slug: data.slug },
    select: { id: true, phone: true },
  });
  if (!salon) return NextResponse.json({ error: "Salon bulunamadı" }, { status: 404 });

  const blocked = await prisma.blockedCustomer.findUnique({
    where: { salonId_phone: { salonId: salon.id, phone: data.customerPhone } },
  });
  if (blocked) {
    return NextResponse.json(
      {
        error: "BLOCKED",
        message: `Bu telefon numarası ile randevu alabilmek için kapora ödemeniz gerekmektedir. Lütfen salonumuzu arayın${salon.phone ? `: ${salon.phone}` : ""}.`,
      },
      { status: 403 },
    );
  }

  const services = await prisma.service.findMany({
    where: { id: { in: data.serviceIds }, salonId: salon.id },
  });
  if (services.length !== data.serviceIds.length) {
    return NextResponse.json({ error: "Geçersiz hizmet" }, { status: 400 });
  }
  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

  const dateObj = parseDateOnly(data.date);

  // Resolve staff: if "any", pick a staff member that's actually free for this slot.
  let staffId = data.staffId && data.staffId !== "any" ? data.staffId : null;
  if (!staffId) {
    const slots = await computeSlots({
      salonId: salon.id,
      staffId: null,
      date: data.date,
      totalDurationMinutes: totalDuration,
    });
    const slot = slots.find((s) => s.time === data.time && s.available);
    if (!slot || slot.availableStaffIds.length === 0) {
      return NextResponse.json(
        { error: "Bu saat artık müsait değil, lütfen başka bir saat seçin." },
        { status: 409 },
      );
    }
    staffId = slot.availableStaffIds[0];
  }

  const startMinutes = timeToMinutes(data.time);
  const endMinutes = startMinutes + totalDuration;

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-check conflicts inside the transaction.
      const conflicts = await tx.appointment.findMany({
        where: {
          staffId: staffId!,
          date: dateObj,
          status: { in: ["pending", "confirmed"] },
        },
        select: { time: true, durationMinutes: true },
      });
      for (const c of conflicts) {
        const cStart = timeToMinutes(c.time);
        const cEnd = cStart + c.durationMinutes;
        if (startMinutes < cEnd && cStart < endMinutes) {
          throw new Error("SLOT_TAKEN");
        }
      }

      // We create one Appointment row per booking; durationMinutes covers all selected services.
      // serviceId points to the first service for display; full list could be tracked via a join table later.
      return tx.appointment.create({
        data: {
          salonId: salon.id,
          serviceId: services[0].id,
          staffId: staffId!,
          date: dateObj,
          time: data.time,
          durationMinutes: totalDuration,
          customerName: data.customerName.trim(),
          customerPhone: data.customerPhone.trim(),
          status: "confirmed",
        },
      });
    });

    return NextResponse.json({ id: created.id, status: created.status });
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "Bu saat az önce dolduruldu, lütfen başka bir saat seçin." },
        { status: 409 },
      );
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Bu saat az önce dolduruldu, lütfen başka bir saat seçin." },
        { status: 409 },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Beklenmeyen bir hata oluştu" }, { status: 500 });
  }
}
