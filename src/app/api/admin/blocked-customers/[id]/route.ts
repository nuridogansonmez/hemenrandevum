import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await prisma.blockedCustomer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
