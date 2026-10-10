import mongoose from "mongoose";
import { runDataUpgrades } from "@/lib/dataUpgrades";

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, upgrades: null };
}

export default async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error("Please define MONGODB_URI in your environment variables.");
  }

  if (!cached.conn) {
    if (!cached.promise) {
      cached.promise = mongoose
        .connect(MONGODB_URI, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 10000
        })
        .catch((error) => {
          // Let the next request try again instead of caching a failed connection.
          cached.promise = null;
          throw error;
        });
    }

    cached.conn = await cached.promise;
  }

  // One-time tidy-up of older records, once per server start.
  if (!cached.upgrades) {
    cached.upgrades = runDataUpgrades().catch((error) => {
      console.error("Data upgrade failed:", error);
    });
  }
  await cached.upgrades;

  return cached.conn;
}
