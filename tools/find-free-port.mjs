import { createServer } from 'node:net';

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once('error', (error) => {
      if (error && (error.code === 'EAFNOSUPPORT' || error.code === 'EADDRNOTAVAIL')) {
        resolve(true);
        return;
      }
      resolve(false);
    });
    server.listen({ port, host, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function isPortFree(port) {
  const checks = await Promise.all([
    canListen(port, '127.0.0.1'),
    canListen(port, '::1'),
    canListen(port),
  ]);
  return checks.every(Boolean);
}

export async function findFreePort(start = 3100, attempts = 50) {
  for (let port = start; port < start + attempts; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`No free port available between ${start} and ${start + attempts - 1}`);
}

export async function resolvePreferredPort(preferredPort, options = {}) {
  const fallbackStart = options.fallbackStart ?? preferredPort + 1;
  const attempts = options.attempts ?? 50;
  if (await isPortFree(preferredPort)) {
    return {
      port: preferredPort,
      requestedPort: preferredPort,
      usedFallback: false,
    };
  }

  const port = await findFreePort(fallbackStart, attempts);
  return {
    port,
    requestedPort: preferredPort,
    usedFallback: true,
  };
}
