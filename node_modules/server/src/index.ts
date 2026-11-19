import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const ALLOWED_METHODS = new Set(["GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"]);
const BLOCKED_HEADERS = new Set(["host","content-length","connection","origin","referer"]);

app.post("/api/request", async (req, res) => {
  const { url, method = "GET", headers = {}, body } = req.body ?? {};
  if (typeof url !== "string") return res.status(400).json({ error: "A URL is required." });
  if (!ALLOWED_METHODS.has(method)) return res.status(400).json({ error: "Unsupported HTTP method." });

  let target: URL;
  try { target = new URL(url); } catch { return res.status(400).json({ error: "Enter a valid absolute URL." }); }
  if (!["http:", "https:"].includes(target.protocol)) return res.status(400).json({ error: "Only HTTP and HTTPS URLs are supported." });

  // This starter is intended for local development. Restrict the proxy before deploying it.
  const outgoingHeaders: Record<string,string> = {};
  if (headers && typeof headers === "object" && !Array.isArray(headers)) {
    for (const [key,value] of Object.entries(headers)) {
      if (!BLOCKED_HEADERS.has(key.toLowerCase()) && typeof value === "string") outgoingHeaders[key] = value;
    }
  }
  if (body !== undefined && !Object.keys(outgoingHeaders).some(k => k.toLowerCase()==="content-type")) {
    outgoingHeaders["Content-Type"] = "application/json";
  }

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const upstream = await fetch(target, {
      method,
      headers: outgoingHeaders,
      body: ["GET","HEAD"].includes(method) || body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)),
      signal: controller.signal,
      redirect: "follow"
    });
    const raw = method === "HEAD" ? "" : await upstream.text();
    let parsed: unknown = raw;
    const contentType = upstream.headers.get("content-type") || "";
    if (contentType.includes("json") && raw) {
      try { parsed = JSON.parse(raw); } catch { /* keep raw text */ }
    }
    const responseHeaders = Object.fromEntries(upstream.headers.entries());
    res.json({
      status: upstream.status,
      statusText: upstream.statusText,
      duration: Date.now() - started,
      size: Buffer.byteLength(raw),
      body: parsed,
      headers: responseHeaders
    });
  } catch (error: any) {
    const message = error?.name === "AbortError" ? "Request timed out after 30 seconds." : (error?.message || "Upstream request failed.");
    res.status(502).json({ error: message, duration: Date.now() - started });
  } finally {
    clearTimeout(timeout);
  }
});

app.get("/api/health", (_req,res) => res.json({ ok:true }));
const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API proxy listening on http://localhost:${port}`));
