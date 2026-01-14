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
const PORT = process.env.SERVER_PORT || 5000;

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

app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
