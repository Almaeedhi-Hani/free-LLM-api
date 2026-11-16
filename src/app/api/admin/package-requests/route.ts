import { NextRequest, NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/storage-mode";

export const dynamic = "force-dynamic";
const authorized = (req: NextRequest) => {
  const secret = process.env.ADMIN_SECRET || process.env.REVALIDATION_SECRET || "";
  const supplied = req.headers.get("x-admin-secret") || "";
  return !!secret && supplied === secret;
};

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const credentials = getSupabaseCredentials();
    if (!credentials) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    const response = await fetch(credentials.url + "/rest/v1/package_requests?select=id,created_at,package_slug,package_price,locale,name,email,phone,country,activity,company,budget,notes,status&order=created_at.desc&limit=100", {
      headers: { apikey: credentials.key, Authorization: "Bearer " + credentials.key }, cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    return NextResponse.json({ requests: await response.json() });
  } catch {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }
}
