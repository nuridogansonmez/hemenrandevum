import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

const schema = z.object({
  phone: z.string().min(7).max(30),
  slug: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const { phone, slug } = parsed.data;

  const salon = await prisma.salon.findUnique({ where: { slug }, select: { id: true, phone: true } });
  if (!salon) return NextResponse.json({ error: "Salon bulunamadı" }, { status: 404 });

  // Block check before sending SMS
  const blocked = await prisma.blockedCustomer.findUnique({
    where: { salonId_phone: { salonId: salon.id, phone } },
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

  // Rate limit: 1 request per minute per phone
  const recent = await prisma.phoneVerification.findFirst({
    where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent) {
    return NextResponse.json({ error: "Çok sık istek. Lütfen 1 dakika bekleyin." }, { status: 429 });
  }

  const code = Math.floor(100_000 + Math.random() * 900_000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 minutes

  await prisma.phoneVerification.deleteMany({ where: { phone } });
  await prisma.phoneVerification.create({ data: { phone, code, expiresAt } });

  try {
    await sendSms(phone, `Randevu kodunuz: ${code}. 10 dakika geçerlidir.`);
  } catch (err) {
    console.error("SMS send failed:", err);
    return NextResponse.json({ error: "SMS gönderilemedi. Telefon numaranızı kontrol edin." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
