import { prisma } from "@/lib/prisma";

const SLOT_INTERVAL_MINUTES = 15;

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function parseDateOnly(dateStr: string): Date {
  // "YYYY-MM-DD" -> Date at UTC midnight to match Prisma @db.Date
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export interface SlotQuery {
  salonId: string;
  staffId: string | null; // null = "Fark Etmez"
  date: string; // YYYY-MM-DD
  totalDurationMinutes: number;
}

export interface SlotResult {
  time: string;
  available: boolean;
  availableStaffIds: string[];
}

/**
 * Compute all slots for a date with availability flags.
 * If staffId is null, a slot is available when ANY active staff member can cover it.
 */
export async function computeSlots(q: SlotQuery): Promise<SlotResult[]> {
  const date = parseDateOnly(q.date);
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday

  const allStaff = q.staffId
    ? await prisma.staff.findMany({
        where: { id: q.staffId, salonId: q.salonId, isActive: true },
        include: { workingHours: { where: { dayOfWeek } } },
      })
    : await prisma.staff.findMany({
        where: { salonId: q.salonId, isActive: true },
        include: { workingHours: { where: { dayOfWeek } } },
      });

  // Filter out staff on leave for this date
  const onLeave = await prisma.staffLeave.findMany({
    where: { staffId: { in: allStaff.map((s) => s.id) }, date },
    select: { staffId: true },
  });
  const onLeaveIds = new Set(onLeave.map((l) => l.staffId));

  const candidates = allStaff.filter((s) => s.workingHours.length > 0 && !onLeaveIds.has(s.id));
  if (candidates.length === 0) return [];

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: q.salonId,
      date,
      status: { in: ["pending", "confirmed"] },
      staffId: { in: candidates.map((s) => s.id) },
    },
    select: { staffId: true, time: true, durationMinutes: true },
  });

  const busyByStaff = new Map<string, Array<[number, number]>>();
  for (const a of appointments) {
    const start = timeToMinutes(a.time);
    const end = start + a.durationMinutes;
    const list = busyByStaff.get(a.staffId) ?? [];
    list.push([start, end]);
    busyByStaff.set(a.staffId, list);
  }

  // Build the union of working windows across candidates so the visible grid
  // covers any time that *any* candidate could possibly work.
  let earliestStart = Infinity;
  let latestEnd = -Infinity;
  for (const s of candidates) {
    for (const wh of s.workingHours) {
      earliestStart = Math.min(earliestStart, timeToMinutes(wh.startTime));
      latestEnd = Math.max(latestEnd, timeToMinutes(wh.endTime));
    }
  }
  if (!Number.isFinite(earliestStart) || !Number.isFinite(latestEnd)) return [];

  // Slot times are interpreted in the salon's local timezone (i.e. the server's
  // local time). Compare the user-picked date against today using local components.
  const now = new Date();
  const isToday =
    now.getFullYear() === date.getUTCFullYear() &&
    now.getMonth() === date.getUTCMonth() &&
    now.getDate() === date.getUTCDate();
  const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  const results: SlotResult[] = [];
  for (let t = earliestStart; t + q.totalDurationMinutes <= latestEnd; t += SLOT_INTERVAL_MINUTES) {
    const slotEnd = t + q.totalDurationMinutes;

    const availableStaffIds: string[] = [];
    for (const s of candidates) {
      const wh = s.workingHours[0];
      if (!wh) continue;
      const wStart = timeToMinutes(wh.startTime);
      const wEnd = timeToMinutes(wh.endTime);
      if (t < wStart || slotEnd > wEnd) continue;

      const busy = busyByStaff.get(s.id) ?? [];
      const conflict = busy.some(([bs, be]) => rangesOverlap(t, slotEnd, bs, be));
      if (!conflict) availableStaffIds.push(s.id);
    }

    const inPast = isToday && t <= nowMinutes;
    results.push({
      time: minutesToTime(t),
      available: !inPast && availableStaffIds.length > 0,
      availableStaffIds,
    });
  }

  return results;
}
