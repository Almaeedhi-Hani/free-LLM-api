import { NextRequest, NextResponse } from 'next/server';

const GEO_API_KEY = process.env.GEO_API_KEY || '';

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-geo-api-key') || '';
  if (!GEO_API_KEY || !key) return false;
  // Constant-time comparison
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
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const [compsRes, obsRes, kwsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/competitors?select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/competitor_observations?select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/keywords?select=*`, { headers }),
    ]);

    const competitors = compsRes.ok ? await compsRes.json() : [];
    const observations = obsRes.ok ? await obsRes.json() : [];
    const keywords = kwsRes.ok ? await kwsRes.json() : [];

    return NextResponse.json({
      competitors,
      observations,
      keywords,
      counts: {
        competitors: competitors.length,
        observations: observations.length,
        keywords: keywords.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}