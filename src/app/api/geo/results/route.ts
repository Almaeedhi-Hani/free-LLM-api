import { NextRequest, NextResponse } from 'next/server';

const GEO_API_KEY = process.env.GEO_API_KEY || '';
const MAX_OPPORTUNITIES = 50;
const MAX_GOALS = 50;
const MAX_DRAFTS = 50;

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

function validateOpportunity(o: any): boolean {
  if (!o || typeof o !== 'object') return false;
  if (!o.title || typeof o.title !== 'string' || o.title.length > 500) return false;
  if (!['gap', 'content', 'keyword'].includes(o.type)) return false;
  if (typeof o.score !== 'number' || o.score < 0 || o.score > 100) return false;
  return true;
}

function validateGoal(g: any): boolean {
  if (!g || typeof g !== 'object') return false;
  if (!g.title || typeof g.title !== 'string' || g.title.length > 500) return false;
  if (!['high', 'medium', 'low'].includes(g.priority)) return false;
  return true;
}

function validateDraft(d: any): boolean {
  if (!d || typeof d !== 'object') return false;
  const q = d.q || d.question;
  const a = d.a || d.answer;
  if (!q || typeof q !== 'string' || q.length > 1000) return false;
  if (!a || typeof a !== 'string' || a.length > 5000) return false;
  if (!['low', 'medium', 'high'].includes(d.risk_level)) return false;
  return true;
}

function isArabicTextValid(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Check for common mojibake patterns
  if (text.includes('�') || /[�]/u.test(text)) return false;
  // Check for valid Arabic or Latin characters
  return /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s\d\-.,;:()!?/\\"'<>]+$/u.test(text) ||
         /^[\x20-\x7E\s]+$/.test(text); // Allow pure ASCII
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured on server' }, { status: 503 });
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

  // Save opportunities
  if (Array.isArray(opportunities) && opportunities.length > 0) {
    const validOpps = opportunities
      .slice(0, MAX_OPPORTUNITIES)
      .filter(validateOpportunity);
    
    if (validOpps.length > 0) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/opportunities`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(validOpps.map((o: any) => ({
            title: String(o.title).substring(0, 500),
            type: String(o.type),
            score: Math.max(0, Math.min(100, Number(o.score))),
            description: String(o.description || '').substring(0, 2000),
            created_at: new Date().toISOString(),
          }))),
        });
        results.opportunities = res.ok ? await res.json() : { error: res.status };
      } catch (e) {
        results.opportunities = { error: String(e) };
      }
    } else {
      results.opportunities = { error: 'No valid opportunities after validation' };
    }
  }

  // Save goals
  if (Array.isArray(goals) && goals.length > 0) {
    const validGoals = goals
      .slice(0, MAX_GOALS)
      .filter(validateGoal);
    
    if (validGoals.length > 0) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/agent_goals`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(validGoals.map((g: any) => ({
            title: String(g.title).substring(0, 500),
            priority: g.priority,
            created_at: new Date().toISOString(),
          }))),
        });
        results.goals = res.ok ? await res.json() : { error: res.status };
      } catch (e) {
        results.goals = { error: String(e) };
      }
    } else {
      results.goals = { error: 'No valid goals after validation' };
    }
  }

  // Save drafts
  if (Array.isArray(drafts) && drafts.length > 0) {
    const validDrafts = drafts
      .slice(0, MAX_DRAFTS)
      .filter((d: any) => {
        if (!validateDraft(d)) return false;
        const q = d.q || d.question;
        const a = d.a || d.answer;
        return isArabicTextValid(q) && isArabicTextValid(a);
      });
    
    if (validDrafts.length > 0) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/content_drafts`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify(validDrafts.map((d: any) => ({
            question: String(d.q || d.question).substring(0, 1000),
            answer: String(d.a || d.answer).substring(0, 5000),
            risk_level: d.risk_level,
            status: 'pending_review',
            created_at: new Date().toISOString(),
          }))),
        });
        results.drafts = res.ok ? await res.json() : { error: res.status };
      } catch (e) {
        results.drafts = { error: String(e) };
      }
    } else {
      results.drafts = { error: 'No valid drafts after validation (encoding check failed)' };
    }
  }

  return NextResponse.json({ saved: results });
}