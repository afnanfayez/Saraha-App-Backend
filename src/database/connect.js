import mongoose from "mongoose";
import { env } from "../config/env.js";

mongoose.set("strictQuery", true);
mongoose.set("sanitizeFilter", true);

export async function connectDatabase() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 8000,
    autoIndex: env.nodeEnv !== "production"
  });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
