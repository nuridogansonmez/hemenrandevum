import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const salon = await prisma.salon.findFirst({ orderBy: { createdAt: "asc" } });
  if (!salon) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Salon bulunamadı. Önce seed çalıştırın.</p>
      </main>
    );
  }

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const [appointments, staff, services, blockedCustomers] = await Promise.all([
    prisma.appointment.findMany({
      orderBy: [{ date: "desc" }, { time: "asc" }],
      include: {
        service: { select: { name: true, price: true } },
        staff: { select: { name: true } },
        salon: { select: { name: true } },
      },
      take: 500,
    }),
    prisma.staff.findMany({
      where: { salonId: salon.id },
      orderBy: { name: "asc" },
      include: {
        workingHours: { orderBy: { dayOfWeek: "asc" } },
        leaves: { orderBy: { date: "asc" }, select: { date: true } },
        _count: { select: { appointments: { where: { status: { not: "cancelled" } } } } },
      },
    }),
    prisma.service.findMany({
      where: { salonId: salon.id },
      orderBy: { name: "asc" },
    }),
    prisma.blockedCustomer.findMany({
      where: { salonId: salon.id },
      orderBy: { blockedAt: "desc" },
    }),
  ]);

  const serializedAppointments = appointments.map((a) => {
    const apptDate = new Date(Date.UTC(
      a.date.getUTCFullYear(), a.date.getUTCMonth(), a.date.getUTCDate()
    ));
    const isPast = apptDate < todayUtc ||
      (apptDate.getTime() === todayUtc.getTime() && a.time < `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`);
    return {
      id: a.id,
      date: a.date.toISOString().slice(0, 10),
      time: a.time,
      durationMinutes: a.durationMinutes,
      customerName: a.customerName,
      customerPhone: a.customerPhone,
      serviceName: a.service.name,
      servicePrice: a.service.price,
      staffName: a.staff.name,
      salonName: a.salon.name,
      status: a.status as "pending" | "confirmed" | "cancelled",
      noShow: a.noShow,
      actualAmount: a.actualAmount,
      isToday: apptDate.getTime() === todayUtc.getTime(),
      isPast,
    };
  });

  const serializedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    appointmentCount: s._count.appointments,
    workingHours: s.workingHours.map((wh) => ({
      id: wh.id,
      dayOfWeek: wh.dayOfWeek,
      startTime: wh.startTime,
      endTime: wh.endTime,
    })),
    leaves: s.leaves.map((l) => l.date.toISOString().slice(0, 10)),
  }));

  return (
    <AdminShell
      salonId={salon.id}
      salonSlug={salon.slug}
      salonName={salon.name}
      appointments={serializedAppointments}
      staff={serializedStaff}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: s.price,
      }))}
      blockedCustomers={blockedCustomers.map((b) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        blockedAt: b.blockedAt.toISOString(),
      }))}
    />
  );
}
