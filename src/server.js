import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./database/connect.js";
import { User } from "./database/models/user.model.js";
import { Message } from "./database/models/message.model.js";
import { RefreshSession } from "./database/models/refresh-session.model.js";
import { EmailToken } from "./database/models/email-token.model.js";
import { Report } from "./database/models/report.model.js";
import { env } from "./config/env.js";

let server;

async function start() {
  await connectDatabase();
  await Promise.all([User.init(), Message.init(), RefreshSession.init(), EmailToken.init(), Report.init()]);

  const app = createApp();
  server = app.listen(env.port, "127.0.0.1", () => {
    console.log("Saraha API listening on http://127.0.0.1:" + env.port + "/api/v1");
  });
}

async function shutdown(signal) {
  console.log(signal + " received; closing the API");
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

start().catch((error) => {
  console.error("API startup failed:", error.message);
  process.exit(1);
});
