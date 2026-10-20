import { NextResponse } from "next/server";

/**
 * Same-origin redirect with a relative Location header. Behind Docker or a
 * proxy the server may see another host (e.g. 0.0.0.0); a relative target
 * always resolves against the address the browser actually used.
 */
export function localRedirect(path: string, status = 307) {
  const safe = path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "/";
  return new NextResponse(null, { status, headers: { Location: safe } });
}
