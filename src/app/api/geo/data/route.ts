import { NextRequest, NextResponse } from 'next/server';

const GEO_API_KEY = process.env.GEO_API_KEY || '';
const MAX_COMPETITORS = 100;
const MAX_OBSERVATIONS = 200;
const MAX_KEYWORDS = 200;

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

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Supabase not configured on server' }, { status: 503 });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const [compsRes, obsRes, kwsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/competitors?select=*&limit=${MAX_COMPETITORS}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/competitor_observations?select=*&limit=${MAX_OBSERVATIONS}`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/keywords?select=*&limit=${MAX_KEYWORDS}`, { headers }),
    ]);

    const competitors = compsRes.ok ? await compsRes.json() : [];
    const observations = obsRes.ok ? await obsRes.json() : [];
    const keywords = kwsRes.ok ? await kwsRes.json() : [];

    return NextResponse.json({
      competitors: Array.isArray(competitors) ? competitors : [],
      observations: Array.isArray(observations) ? observations : [],
      keywords: Array.isArray(keywords) ? keywords : [],
      counts: {
        competitors: (competitors || []).length,
        observations: (observations || []).length,
        keywords: (keywords || []).length,
      },
      source: 'supabase',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch data from Supabase' }, { status: 500 });
  }
}