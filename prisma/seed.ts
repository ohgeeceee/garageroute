import { PrismaClient } from "@prisma/client";
import { mockSales } from "../data/sales";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean slate
  await prisma.item.deleteMany();
  await prisma.sale.deleteMany();

  for (const sale of mockSales) {
    await prisma.sale.create({
      data: {
        title: sale.title,
        type: sale.type,
        address: sale.address,
        city: sale.city,
        state: sale.state,
        zip: sale.zip,
        lat: sale.lat,
        lng: sale.lng,
        dates: sale.dates,
        hours: sale.hours,
        description: sale.description,
        seller: sale.seller,
        verified: sale.verified,
        photos: JSON.stringify(sale.photos),
        impactKg: sale.items.length * 2.5,
        items: {
          create: sale.items.map((item) => ({
            name: item.name,
            category: item.category,
            price: item.price,
            condition: item.condition,
            photo: item.photo,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${mockSales.length} sales.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
