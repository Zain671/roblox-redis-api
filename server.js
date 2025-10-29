import express from "express";
import bodyParser from "body-parser";
import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(bodyParser.json());

// Redis connection
const client = createClient({ url: process.env.REDIS_URL });
client.on("error", (err) => console.error("Redis Client Error", err));
await client.connect();

// API key auth middleware
app.use((req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

  const token = authHeader.replace("Bearer ", "").trim();
  if (token !== process.env.API_KEY) return res.status(403).json({ error: "Invalid API key" });

  next();
});

// 🟥 Set ban info
app.post("/set/:key", async (req, res) => {
  try {
    await client.set(req.params.key, JSON.stringify(req.body));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 🟩 Get ban info
app.get("/get/:key", async (req, res) => {
  try {
    const value = await client.get(req.params.key);
    if (!value) return res.status(404).json({ error: "Not found" });
    res.send(value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟧 Delete ban
app.post("/del/:key", async (req, res) => {
  try {
    await client.del(req.params.key);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟨 Expire key
app.post("/expire/:key/:seconds", async (req, res) => {
  try {
    const seconds = parseInt(req.params.seconds);
    await client.expire(req.params.key, seconds);
    res.json({ ok: true, expiresIn: seconds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟦 Add to set
app.post("/sadd/:set/:value", async (req, res) => {
  try {
    await client.sAdd(req.params.set, req.params.value);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟪 Remove from set
app.post("/srem/:set/:value", async (req, res) => {
  try {
    await client.sRem(req.params.set, req.params.value);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root
app.get("/", (req, res) => {
  res.send("✅ Roblox Redis API is running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`API listening on port ${process.env.PORT || 3000}`);
});
