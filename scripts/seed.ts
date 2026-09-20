import { seedDatabase } from "../src/lib/services/seed-service";
import clientPromise from "../src/lib/db/mongodb";

async function main() {
  console.log("Seeding MongoDB database with initial master entities and claims...");
  try {
    const result = await seedDatabase();
    console.log("Database seeded successfully!");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    const client = await clientPromise;
    await client.close();
    process.exit(0);
  }
}

main();
