import { seedDatabase } from "../src/lib/services/seed-service";
import mongoose from "mongoose";

async function main() {
  console.log("Seeding MongoDB database via Mongoose with master entities and claims...");
  try {
    const result = await seedDatabase();
    console.log("Database seeded successfully via Mongoose!");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
