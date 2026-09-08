import rateLimit from "express-rate-limit";
import type { Request } from "express";

// Baseline guard against generic abuse/scraping across the whole API. Mounted
// at app.use('/api', apiLimiter), before any route's requireAuth runs, so
// req.user is never populated here yet - this always keys by IP today. Kept
// as a function (rather than relying on the default keyGenerator) so a
// route-specific limiter mounted *after* requireAuth can reuse it to key by
// account instead.
function keyByUserOrIp(req: Request): string {
  return req.user?.uid ?? req.ip ?? "unknown";
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: "Too many requests. Please try again later." },
});
