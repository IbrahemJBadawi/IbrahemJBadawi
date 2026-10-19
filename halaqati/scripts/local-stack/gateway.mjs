// Minimal stand-in for the Supabase API gateway: /auth/v1 → Auth, /rest/v1 → PostgREST.
import http from "node:http";

const PORT = Number(process.env.GATEWAY_PORT ?? 54321);
const routes = [
  ["/auth/v1", process.env.AUTH_HOST ?? "127.0.0.1", Number(process.env.AUTH_PORT ?? 9999)],
  ["/rest/v1", process.env.REST_HOST ?? "127.0.0.1", Number(process.env.REST_PORT ?? 3001)],
];

http
  .createServer((req, res) => {
    const route = routes.find(([prefix]) => req.url.startsWith(prefix));
    if (!route) { res.writeHead(404).end(); return; }
    const [prefix, host, port] = route;
    const upstream = http.request(
      { host, port, path: req.url.slice(prefix.length) || "/", method: req.method, headers: { ...req.headers, host: `${host}:${port}` } },
      (up) => { res.writeHead(up.statusCode ?? 502, up.headers); up.pipe(res); },
    );
    upstream.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(upstream);
  })
  .listen(PORT, () => console.log(`gateway on :${PORT}`));
