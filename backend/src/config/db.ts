import mongoose from "mongoose";
import { env } from "./env";
import { AnalysisPageModel } from "../models/AnalysisPage";

const ensureIndexes = async () => {
  try {
    await AnalysisPageModel.collection.dropIndex("runId_1_url_1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("index not found") && !message.includes("IndexNotFound")) {
      console.warn("[mongo] Could not drop obsolete AnalysisPage index:", message || error);
    }
  }

  await AnalysisPageModel.createIndexes();
};

export const connectDB = async () => {
  try {
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
      maxPoolSize: env.database.maxPoolSize,
      minPoolSize: env.database.minPoolSize,
      serverSelectionTimeoutMS: env.database.serverSelectionTimeoutMs,
      socketTimeoutMS: env.database.socketTimeoutMs,
      ...(env.secrets.mongoDbName ? { dbName: env.secrets.mongoDbName } : {}),
    });

    console.log("✅ MongoDB Connected");
    await ensureIndexes();
  } catch (error) {
    console.error("❌ DB Error:", error);
    process.exit(1);
  }
};
