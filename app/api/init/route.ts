import { NextRequest, NextResponse } from "next/server";
import { createIndexes } from "@/lib/mongodb-indexes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.INIT_API_TOKEN;
  if (!expectedToken) return false;
  const token = request.headers.get("x-init-token");
  return token === expectedToken;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  await createIndexes();
  return NextResponse.json({ success: true });
}
