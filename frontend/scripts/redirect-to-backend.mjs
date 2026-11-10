// Production mode on this PC: the backend serves the ERP on port 4000, so the old development address
// (port 5173) only sends people there. Bookmarks to http://<this-pc>:5173/ keep working.
// Started by run-frontend.ps1 when a release is installed (release\seals-backend.jar). No dependencies.
//
//   node scripts/redirect-to-backend.mjs            listens on 127.0.0.1:5173
//   SMS_DEV_HOST=0.0.0.0                             also answer other PCs (same switch as the dev server)
//   SMS_BACKEND_PORT=4000                            where to send people

import http from "node:http";

const listenHost = process.env.SMS_DEV_HOST || "127.0.0.1";
const listenPort = Number(process.env.SMS_REDIRECT_PORT || 5173);
const backendPort = Number(process.env.SMS_BACKEND_PORT || 4000);

const server = http.createServer((req, res) => {
  if (req.url === "/__health") {
    res.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("ok");
    return;
  }
  // Same host name the person typed (localhost, this PC's address or name), only the port changes.
  const hostHeader = String(req.headers.host || "localhost");
  const hostname = hostHeader.startsWith("[") ? hostHeader.slice(0, hostHeader.indexOf("]") + 1) : hostHeader.split(":")[0];
  const safeHost = /^[A-Za-z0-9.\-\[\]:]+$/.test(hostname) ? hostname : "localhost";
  const location = `http://${safeHost}:${backendPort}/`;
  res.writeHead(302, { Location: location, "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><title>Silver Brain</title><p>The ERP has moved to <a href="${location}">${location}</a>.</p>`);
});

server.listen(listenPort, listenHost, () => {
  console.log(`Redirecting http://${listenHost}:${listenPort}/ to port ${backendPort} (production mode).`);
});
