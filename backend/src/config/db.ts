import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async () => {
  try {
    if (!env.secrets.mongoUri) {
      throw new Error("Missing required environment variable: MONGO_URI");
    }

    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
    });

    await mongoose.connect(env.secrets.mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 15_000,
      socketTimeoutMS: 45_000,
    });

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ DB Error:", error);
    process.exit(1);
  }
};
