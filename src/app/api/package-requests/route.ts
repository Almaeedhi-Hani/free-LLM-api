import { NextRequest, NextResponse } from "next/server";
import { getContent } from "@/lib/content-store";
import { getSupabaseCredentials } from "@/lib/storage-mode";
import { packageOffers } from "@/lib/package-offers";

export const dynamic = "force-dynamic";
const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validPhone = (v: string) => /^[+\d\s()\-]{7,30}$/.test(v);
const validWhatsapp = (v: string) => /^https:\/\/(?:wa\.me\/\d{8,15}|(?:api\.)?whatsapp\.com\/send\?phone=\d{8,15})(?:[&#?].*)?$/.test(v);

export async function POST(req: NextRequest) {
  try {
    if (Number(req.headers.get("content-length") || 0) > 8192)
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const data = await req.json();
    if (!data || typeof data !== "object" || Array.isArray(data))
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    // Honeypot: do not persist automated spam.
    if (data.website) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const name = text(data.name, 120), email = text(data.email, 200), phone = text(data.phone, 30);
    const country = text(data.country, 100), activity = text(data.activity, 200), notes = text(data.notes, 1500);
    const packageSlug = text(data.packageSlug, 90), locale = text(data.locale, 2);
    const company = text(data.company, 10), budget = text(data.budget, 30);
    if (!name || !validEmail(email) || !validPhone(phone) || !activity ||
      !["ar","en","zh"].includes(locale) || !["yes","no","unsure"].includes(company) ||
      !["undecided","under50000","50000-250000","over250000"].includes(budget))
      return NextResponse.json({ error: "Invalid contact or investment details" }, { status: 400 });
    const offer = packageOffers.find(p => p.slug === packageSlug);
    if (!offer) return NextResponse.json({ error: "Unknown package" }, { status: 400 });
    const credentials = getSupabaseCredentials();
    if (!credentials) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });
    const contact = (await getContent()).contact;
    if (!validWhatsapp(contact.whatsapp)) return NextResponse.json({ error: "WhatsApp contact unavailable" }, { status: 503 });
    const id = crypto.randomUUID();
    const record = { id, package_slug: packageSlug, package_price: offer.price, locale, name, email, phone, country, activity, company, budget, notes, status: "saved" };
    const saved = await fetch(credentials.url + "/rest/v1/package_requests", {
      method: "POST", cache: "no-store",
      headers: { apikey: credentials.key, Authorization: "Bearer " + credentials.key, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(record)
    });
    if (!saved.ok) {
      console.error("Package request persistence failed", saved.status);
      return NextResponse.json({ error: "Could not save request" }, { status: 503 });
    }
    const message = [
      "New investor package request / طلب باقة استثمارية", "Reference: " + id,
      "Package: " + offer.title[locale as "ar"|"en"|"zh"], "Price: " + offer.price + " SAR",
      "Name: " + name, "Phone: " + phone, "Email: " + email,
      "Country: " + country, "Activity: " + activity,
      "Foreign company: " + company, "Budget: " + budget, "Notes: " + notes
    ].join("\n");
    const url = new URL(contact.whatsapp);
    url.searchParams.set("text", message);
    return NextResponse.json({ saved: true, reference: id, whatsappUrl: url.toString() });
  } catch (error) {
    console.error("Package request error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Request failed" }, { status: 503 });
  }
}
