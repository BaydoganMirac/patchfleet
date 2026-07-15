import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { refreshCodexObservation } from "@/lib/runtime/observe.mjs";

function allowedHost(host: string | null) {
  const match = /^(?:localhost|127\.0\.0\.1)(?::([0-9]+))?$/i.exec(host ?? "");
  const port = match?.[1] ? Number(match[1]) : null;
  return Boolean(match) && (port === null || (port >= 1 && port <= 65535));
}

function allowedRequest(request: NextRequest) {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  if (!allowedHost(host) || !origin || request.headers.has("transfer-encoding")) return false;

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && contentLength !== "0") return false;

  try {
    const parsed = new URL(origin);
    return (
      parsed.origin === origin &&
      parsed.protocol === request.nextUrl.protocol &&
      parsed.host.toLowerCase() === host?.toLowerCase()
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!allowedRequest(request)) return new NextResponse("Forbidden", { status: 403 });

  try {
    await refreshCodexObservation();
    return NextResponse.redirect(new URL("/", request.headers.get("origin")!), 303);
  } catch {
    return new NextResponse("Local observation failed", { status: 500 });
  }
}
