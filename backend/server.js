import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import ngoRoutes from "./routes/ngo.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PREFERRED_PORT = Number(process.env.SERVER_PORT) || 5001;

// ✅ CORS (not required in Option B but okay)
app.use(cors());

// ✅ JSON body parsing (file uploads won't use this)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve frontend files from ROOT project
const rootDir = path.resolve(__dirname, "..");

// ✅ Block exposing backend folder + node_modules
app.use((req, res, next) => {
  if (req.path.startsWith("/backend") || req.path.startsWith("/node_modules")) {
    return res.status(404).send("Not Found");
  }
  next();
});

// ✅ Serve your front-end
app.use(express.static(rootDir));

// ✅ API Routes
app.use("/api/ngo", ngoRoutes);

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ✅ Default home
app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

function listenOnce(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve({ server, port }));
    server.on("error", reject);
  });
}

async function startServerWithFallback(preferredPort, maxAttempts = 20) {
  let port = preferredPort;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { port: actualPort } = await listenOnce(port);
      console.log(`✅ Server running: http://localhost:${actualPort}`);
      if (actualPort !== preferredPort) {
        console.warn(`ℹ️ Preferred port ${preferredPort} was busy; using ${actualPort} instead.`);
      }
      return;
    } catch (err) {
      if (err && err.code === "EADDRINUSE") {
        port += 1;
        continue;
      }
      throw err;
    }
  }

  console.error(
    `❌ Could not find a free port starting at ${preferredPort} (tried ${maxAttempts} ports). Set SERVER_PORT to a different value.`
  );
  process.exit(1);
}

startServerWithFallback(PREFERRED_PORT);
