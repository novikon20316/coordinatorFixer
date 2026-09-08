import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { isFirebaseReady } from "./config/firebase";
import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimit";
import routes from "./routes";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// Set when deployed behind a reverse proxy (Cloud Run, Render, etc.) that
// terminates TLS and forwards X-Forwarded-For - without this, rate limiting
// and req.ip would see the proxy's IP for every request instead of the
// client's. Leave unset for plain local dev.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

// A stray unhandled rejection/exception outside the request lifecycle
// (nothing today, but nothing prevents one being added later) would
// otherwise either crash the whole process silently or leave it in an
// undefined state. Log and keep running for rejections; log and exit for
// exceptions, matching Node's own guidance that the process shouldn't keep
// serving requests after one.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception - exiting:", err);
  process.exit(1);
});

// Baseline security response headers (X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security, etc). This is a JSON API with no HTML views, so
// helmet's default CSP has nothing to restrict here.
app.use(helmet());

// Origin allowlist rather than a single CLIENT_ORIGIN, since local dev and
// the deployed web app are different origins and both need to work. Only
// browsers send/enforce Origin at all - server-to-server calls and the
// mobile app's fetch have none, which `!origin` covers.
const ALLOWED_ORIGINS = new Set(
  (process.env.CLIENT_ORIGINS ?? process.env.CLIENT_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
  })
);

// Small limit - this API has no file uploads today; a generous body limit on
// a JSON-only API is just a bigger DoS surface for no benefit.
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", firebaseReady: isFirebaseReady() });
});

app.use("/api", apiLimiter, routes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
