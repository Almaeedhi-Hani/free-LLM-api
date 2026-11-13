import { NextRequest, NextResponse } from 'next/server';

const GEO_API_KEY = process.env.GEO_API_KEY || '';

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-geo-api-key') || '';
  if (!GEO_API_KEY || !key) return false;
  if (key.length !== GEO_API_KEY.length) return false;
  let result = 0;
  for (let i = 0; i < key.length; i++) {
    result |= key.charCodeAt(i) ^ GEO_API_KEY.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { opportunities, goals, drafts, source_run_id } = body;
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  const results: Record<string, any> = {};

  // Save opportunities (if table exists)
  if (Array.isArray(opportunities) && opportunities.length > 0) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/opportunities`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(opportunities.map((o: any) => ({
          title: String(o.title || '').substring(0, 500),
          type: String(o.type || 'gap'),
          score: Math.max(0, Math.min(100, Number(o.score) || 0)),
          description: String(o.description || '').substring(0, 2000),
          created_at: new Date().toISOString(),
        }))),
      });
      results.opportunities = res.ok ? await res.json() : { error: res.status };
    } catch (e) {
      results.opportunities = { error: String(e) };
    }
  }

  // Save goals
  if (Array.isArray(goals) && goals.length > 0) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/agent_goals`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(goals.map((g: any) => ({
          title: String(g.title || '').substring(0, 500),
          priority: ['high', 'medium', 'low'].includes(g.priority) ? g.priority : 'medium',
          created_at: new Date().toISOString(),
        }))),
      });
      results.goals = res.ok ? await res.json() : { error: res.status };
    } catch (e) {
      results.goals = { error: String(e) };
    }
  }

  // Save drafts
  if (Array.isArray(drafts) && drafts.length > 0) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/content_drafts`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(drafts.map((d: any) => ({
          question: String(d.q || d.question || '').substring(0, 1000),
          answer: String(d.a || d.answer || '').substring(0, 5000),
          risk_level: ['low', 'medium', 'high'].includes(d.risk_level) ? d.risk_level : 'medium',
          status: 'pending_review',
          created_at: new Date().toISOString(),
        }))),
      });
      results.drafts = res.ok ? await res.json() : { error: res.status };
    } catch (e) {
      results.drafts = { error: String(e) };
    }
  }

  return NextResponse.json({ saved: results });
}