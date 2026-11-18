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
    const response = await fetch(credentials.url + "/rest/v1/package_requests?select=id,request_number,created_at,package_slug,package_price,locale,name,email,phone,country,activity,company,budget,notes,status,viewed_at,share_opened_at&order=created_at.desc&limit=100", {
      headers: { apikey: credentials.key, Authorization: "Bearer " + credentials.key }, cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    return NextResponse.json({ requests: await response.json() });
  } catch {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
  }
}

const validId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await req.json();
    if (!validId(data?.id) || !["viewed", "share_opened", "update_status"].includes(data?.action))
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const credentials = getSupabaseCredentials();
    if (!credentials) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    if (data.action === "update_status") {
      if (!["saved", "contacted", "closed"].includes(data.status))
        return NextResponse.json({ error: "Invalid customer lifecycle status" }, { status: 400 });
      const response = await fetch(credentials.url + "/rest/v1/package_requests?id=eq." + encodeURIComponent(data.id), {
        method: "PATCH", cache: "no-store",
        headers: { apikey: credentials.key, Authorization: "Bearer " + credentials.key, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({status:data.status})
      });
      if (!response.ok) return NextResponse.json({ error: "Could not update customer status" }, { status: 503 });
      const changed = await response.json();
      if (changed.length !== 1) return NextResponse.json({ error: "Request not found or unavailable" }, { status: 404 });
      return NextResponse.json({ ok: true, status: changed[0].status });
    }
    const column = data.action === "viewed" ? "viewed_at" : "share_opened_at";
    const response = await fetch(credentials.url + "/rest/v1/package_requests?id=eq." + encodeURIComponent(data.id) + "&" + column + "=is.null", {
      method: "PATCH", cache: "no-store",
      headers: { apikey: credentials.key, Authorization: "Bearer " + credentials.key, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ [column]: new Date().toISOString() })
    });
    if (!response.ok) return NextResponse.json({ error: "Could not update request" }, { status: 503 });
    const changed = await response.json();
    return NextResponse.json({ ok: true, timestamp: changed[0]?.[column] || null });
  } catch {
    return NextResponse.json({ error: "Could not update request" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await req.json();
    if (!validId(data?.id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const credentials = getSupabaseCredentials();
    if (!credentials) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    const response = await fetch(credentials.url + "/rest/v1/package_requests?id=eq." + encodeURIComponent(data.id), {
      method: "DELETE", cache: "no-store",
      headers: { apikey: credentials.key, Authorization: "Bearer " + credentials.key, Prefer: "return=representation" }
    });
    if (!response.ok) return NextResponse.json({
      error: response.status === 409 ? "Request is linked to a legacy conversion record; apply safe-delete migration" : "Could not delete request"
    }, { status: response.status === 409 ? 409 : 503 });
    const deleted = await response.json();
    if (!deleted.length) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Could not delete request" }, { status: 503 });
  }
}
