import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { slug },
    include: {
      services: { orderBy: { name: "asc" } },
      staff: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  if (!salon) {
    return NextResponse.json({ error: "salon not found" }, { status: 404 });
  }

  return NextResponse.json({
    salon: {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      description: salon.description,
      phone: salon.phone,
      address: salon.address,
    },
    services: salon.services.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: s.price,
    })),
    staff: salon.staff,
  });
}
