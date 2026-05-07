import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedBusiness(params: {
  name: string;
  slug: string;
  description: string;
  phone: string;
  address: string;
  services: { name: string; durationMinutes: number; price: number }[];
  staffNames: string[];
  workingHours: { startTime: string; endTime: string; days: number[] };
}) {
  const salon = await prisma.salon.upsert({
    where: { slug: params.slug },
    update: {},
    create: {
      name: params.name,
      slug: params.slug,
      description: params.description,
      phone: params.phone,
      address: params.address,
    },
  });

  await prisma.service.deleteMany({ where: { salonId: salon.id } });
  const services = await Promise.all(
    params.services.map((s) => prisma.service.create({ data: { ...s, salonId: salon.id } })),
  );

  await prisma.staff.deleteMany({ where: { salonId: salon.id } });
  const staff = [];
  for (const name of params.staffNames) {
    const s = await prisma.staff.create({
      data: { salonId: salon.id, name },
    });
    staff.push(s);
    for (const day of params.workingHours.days) {
      await prisma.workingHours.create({
        data: {
          staffId: s.id,
          dayOfWeek: day,
          startTime: params.workingHours.startTime,
          endTime: params.workingHours.endTime,
        },
      });
    }
  }

  console.log(`Seeded "${salon.name}" — ${services.length} hizmet, ${staff.length} personel.`);
  return salon;
}

async function main() {
  // Demo Kuaför
  await seedBusiness({
    name: "Demo Kuaför",
    slug: "demo-kuafor",
    description: "Profesyonel kuaför hizmetleri. Saç kesimi, boyama, fön ve daha fazlası.",
    phone: "+90 555 100 10 01",
    address: "Bağdat Caddesi No: 10, Kadıköy / İstanbul",
    services: [
      { name: "Saç Kesimi", durationMinutes: 45, price: 250 },
      { name: "Saç Boyama", durationMinutes: 90, price: 800 },
      { name: "Fön", durationMinutes: 30, price: 150 },
      { name: "Manikür", durationMinutes: 45, price: 200 },
    ],
    staffNames: ["Ayşe", "Fatma"],
    workingHours: { startTime: "09:00", endTime: "19:00", days: [1, 2, 3, 4, 5, 6] },
  });

  // Demo Berber
  await seedBusiness({
    name: "Demo Berber",
    slug: "demo-berber",
    description: "Klasik berber hizmetleri. Saç kesimi, sakal tıraşı ve cilt bakımı.",
    phone: "+90 555 200 20 02",
    address: "İstiklal Caddesi No: 20, Beyoğlu / İstanbul",
    services: [
      { name: "Saç Kesimi", durationMinutes: 30, price: 150 },
      { name: "Sakal Tıraşı", durationMinutes: 20, price: 100 },
      { name: "Saç + Sakal", durationMinutes: 45, price: 200 },
      { name: "Cilt Bakımı", durationMinutes: 30, price: 120 },
    ],
    staffNames: ["Ahmet", "Mehmet"],
    workingHours: { startTime: "08:00", endTime: "20:00", days: [1, 2, 3, 4, 5, 6] },
  });

  console.log("\nSeed tamamlandı!");
  console.log("Demo Kuaför: /salon/demo-kuafor");
  console.log("Demo Berber: /salon/demo-berber");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
