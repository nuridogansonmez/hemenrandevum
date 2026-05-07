import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("attended"),
    actualAmount: z.number().int().min(0),
    serviceId: z.string().optional(),
  }),
  z.object({ action: z.literal("noshow") }),
  z.object({ action: z.literal("unattend") }),
  z.object({ action: z.literal("unnoshow") }),
  z.object({ action: z.literal("uncancel") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: { id: true, salonId: true, customerName: true, customerPhone: true },
  });
  if (!appt) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (parsed.data.action === "cancel") {
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "cancelled" },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  if (parsed.data.action === "attended") {
    const data: Record<string, unknown> = { noShow: false, actualAmount: parsed.data.actualAmount };
    if (parsed.data.serviceId) data.serviceId = parsed.data.serviceId;
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data,
      include: { service: { select: { name: true, price: true } } },
    });
    return NextResponse.json({ id: updated.id, actualAmount: updated.actualAmount });
  }

  if (parsed.data.action === "noshow") {
    const [updated] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: params.id },
        data: { noShow: true },
      }),
      prisma.blockedCustomer.upsert({
        where: { salonId_phone: { salonId: appt.salonId, phone: appt.customerPhone } },
        update: { name: appt.customerName, blockedAt: new Date() },
        create: { salonId: appt.salonId, phone: appt.customerPhone, name: appt.customerName },
      }),
    ]);
    return NextResponse.json({ id: updated.id, noShow: updated.noShow });
  }

  if (parsed.data.action === "unattend") {
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { actualAmount: null },
    });
    return NextResponse.json({ id: updated.id });
  }

  if (parsed.data.action === "unnoshow") {
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { noShow: false },
    });
    return NextResponse.json({ id: updated.id });
  }

  if (parsed.data.action === "uncancel") {
    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: "confirmed" },
    });
    return NextResponse.json({ id: updated.id });
  }
}
