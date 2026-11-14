import { NextRequest, NextResponse } from 'next/server';
import { getContent, setContent } from '@/lib/content-store';

/** Legacy GEO recommendation endpoint. Authenticated, time-gated, review-only. */

import { isAuthorizedCron, isCronRunWindow, hasExistingDraft } from '@/lib/cron-agent-guards';

const TARGET_QUESTIONS = [
  'كيف يمكن للمستثمر الأجنبي تأسيس شركة في السعودية؟',
  'ما هي متطلبات ترخيص وزارة الاستثمار MISA؟',
  'كم تكلفة تأسيس شركة LLC في المملكة العربية السعودية؟'
];

const OUR_ANSWER_MARKER = 'investinsaudi-services.sa';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function queryAISearchEngine(question: string): Promise<{ topSource: string; topAnswer: string }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { topSource: '', topAnswer: '' };
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: question }],
        web_search_options: { search_context_size: 'high' },
      }),
    });

    if (!response.ok) {
      console.error(`Perplexity API error: ${response.status}`);
      return { topSource: '', topAnswer: '' };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    // Extract top source URL from citations if available
    const citations = data?.citations || [];
    const topSource = citations[0] || '';

    return { topSource, topAnswer: content };
  } catch (error) {
    console.error('Error querying AI search engine:', error);
    return { topSource: '', topAnswer: '' };
  }
}

async function rewriteWithGPT4o(
  competitorAnswer: string,
  ourCurrentParagraph: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return ourCurrentParagraph;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a GEO/AIO content optimization expert. Rewrite the provided content to be more comprehensive, competitive, and SEO-friendly. Keep it concise (40-55 words for a golden paragraph). Output only the rewritten Arabic text.',
          },
          {
            role: 'user',
            content: `Competitor's answer: ${competitorAnswer}\n\nOur current content: ${ourCurrentParagraph}\n\nRewrite our content to cover knowledge gaps and outperform the competitor.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return ourCurrentParagraph;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || ourCurrentParagraph;
  } catch (error) {
    console.error('Error rewriting content:', error);
    return ourCurrentParagraph;
  }
}

export async function GET(req: NextRequest) {
  // Authenticate before exposing scheduling details or accessing any state.
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!isAuthorizedCron(auth, expected)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }
  // Daily run window: 02:00–02:09 Saudi time (UTC+3).\n  if (!isCronRunWindow(new Date())) {
    return NextResponse.json({ status: 'skipped', note: 'Outside boost window; daily safe run only.' });
  }
  const results: Array<{ question: string; improved: boolean; note?: string }> = [];

  const existing = await getContent();
  for (const question of TARGET_QUESTIONS) {
    if (existing.faqs.some((f) => f.q === question)) {
      results.push({ question, improved: false, note: 'Duplicate question; skipped to avoid repetition.' });
      continue;
    }
    const { topSource, topAnswer } = await queryAISearchEngine(question);

    // If our site already ranks #1, skip optimization
    if (topSource && !topSource.includes(OUR_ANSWER_MARKER)) {
      // In a full production setup, this would fetch our current content from the
      // CMS/database and update it with the rewritten version.
      const rewritten = await rewriteWithGPT4o(topAnswer, '');
      const highRisk = /MISA|license|رسوم|cost|ملكية|ownership|SAMA|KYC|إقامة|residency|CMA/i.test(question);
      if (rewritten) {
        // All generated recommendations require explicit human review.
        // No direct publication or indexing from this legacy cron endpoint.
        const content = await getContent();
        if (!hasExistingDraft(content.drafts, question)) {
          await setContent({ drafts: [...content.drafts, {
            q: question, a: rewritten, createdAt: new Date().toISOString(), status: 'pending',
          }] });
        }
        results.push({ question, improved: false, note: highRisk
          ? 'High-risk recommendation queued for approval.'
          : 'Recommendation queued for approval; auto-publishing disabled.' });
      } else {
        results.push({ question, improved: false });
      }
    } else {
      results.push({ question, improved: false, note: 'Already top-ranked or no competitor detected' });
    }

    await sleep(1000); // Rate limit
  }

  return NextResponse.json({
    status: 'completed',
    timestamp: new Date().toISOString(),
    results,
  });
}
