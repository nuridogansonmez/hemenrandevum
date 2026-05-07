import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

function utcDate(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayUtc = utcDate(now);
  const weekAgoUtc = utcDate(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const monthAgoUtc = utcDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const [todayCount, weekCount, monthCount, pendingCount, allAppointments] = await Promise.all([
    prisma.appointment.count({ where: { date: todayUtc, status: { not: "cancelled" } } }),
    prisma.appointment.count({ where: { date: { gte: weekAgoUtc }, status: { not: "cancelled" } } }),
    prisma.appointment.count({ where: { date: { gte: monthAgoUtc }, status: { not: "cancelled" } } }),
    prisma.appointment.count({ where: { status: "pending" } }),
    prisma.appointment.findMany({
      where: { date: { gte: monthAgoUtc }, status: { not: "cancelled" } },
      include: {
        staff: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true } },
      },
    }),
  ]);

  // Staff yoğunluğu
  const staffMap = new Map<string, { name: string; count: number }>();
  for (const a of allAppointments) {
    const entry = staffMap.get(a.staffId) ?? { name: a.staff.name, count: 0 };
    entry.count++;
    staffMap.set(a.staffId, entry);
  }
  const staffStats = Array.from(staffMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Hizmet popülaritesi
  const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const a of allAppointments) {
    const entry = serviceMap.get(a.serviceId) ?? { name: a.service.name, count: 0, revenue: 0 };
    entry.count++;
    entry.revenue += a.service.price;
    serviceMap.set(a.serviceId, entry);
  }
  const serviceStats = Array.from(serviceMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const monthRevenue = allAppointments.reduce((sum, a) => sum + a.service.price, 0);

  return NextResponse.json({
    todayCount,
    weekCount,
    monthCount,
    pendingCount,
    monthRevenue,
    staffStats,
    serviceStats,
  });
}
