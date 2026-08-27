// Deliberately dependency-free (no "server-only", no DB, no next/headers) so
// it can be safely imported from proxy.ts, which must not pull in the
// Postgres client -- proxy/middleware may run in the Edge runtime, which
// can't open raw TCP sockets.
export const SESSION_COOKIE_NAME = "session";
