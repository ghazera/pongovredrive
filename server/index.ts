import express from "express";
import { resolve } from "node:path";
import { makeServer } from "./app";
const { app, http, close } = makeServer();
if (process.argv.includes("--dev")) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
  } as Parameters<typeof createServer>[0]);
  app.use(vite.middlewares);
} else {
  app.use(express.static(resolve("dist")));
  app.get("/", (_req, res) => res.sendFile(resolve("dist/index.html")));
}
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "0.0.0.0";
http.listen(port, host, () =>
  console.log(`NEON PONG listening on ${host}:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void close().then(() => process.exit(0));
  });
