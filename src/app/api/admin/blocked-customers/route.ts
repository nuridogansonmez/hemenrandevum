import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const salonId = req.nextUrl.searchParams.get("salonId");
  if (!salonId) return NextResponse.json({ error: "salonId required" }, { status: 400 });

  const blocked = await prisma.blockedCustomer.findMany({
    where: { salonId },
    orderBy: { blockedAt: "desc" },
  });

  return NextResponse.json({ blocked });
}
