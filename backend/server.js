import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import ngoRoutes from "./routes/ngo.routes.js";
import slumDwellerRoutes from "./routes/slumDweller.routes.js";
import documentRoutes from "./routes/document.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PREFERRED_PORT = Number(process.env.SERVER_PORT) || 5001;

// ✅ CORS (not required in Option B but okay)
app.use(cors());

// ✅ JSON body parsing - increase limit for document uploads (base64 encoded)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use("/api/slum-dweller", slumDwellerRoutes);
app.use("/api/documents", documentRoutes);

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ✅ Debug endpoint - Show all documents
app.get("/api/debug/documents", async (req, res) => {
  try {
    const [docs] = await (await import("mysql2/promise")).createConnection({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "nanjiba@282002",
      database: process.env.DB_NAME || "slumlink",
    }).then(conn => {
      return Promise.all([
        conn.query('SELECT id, slum_id, document_type, status FROM documents LIMIT 20'),
        conn.end()
      ]);
    });
    res.json({ documents: docs[0] });
  } catch (error) {
    res.json({ error: error.message });
  }
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
