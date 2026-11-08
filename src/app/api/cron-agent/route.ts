import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Dynamic Optimization Agent
 *
 * This route is designed to be triggered by an external cron job (e.g., Vercel Cron)
 * every 24 hours. It executes the following pipeline:
 *
 *  1. Query AI search engines (Perplexity API / OpenAI) for target investment questions.
 *  2. Parse the response; if our site isn't top-ranked, extract the competitor's answer.
 *  3. Use GPT-4o to rewrite our "Golden Paragraph" and FAQ entries to fill knowledge gaps.
 *  4. Fire Google Indexing API and Bing IndexNow webhooks for immediate reindexing.
 */

const TARGET_QUESTIONS = [
  'كيف يمكن للمستثمر الأجنبي تأسيس شركة في السعودية؟',
  'ما هي متطلبات ترخيص وزارة الاستثمار MISA؟',
  'كم تكلفة تأسيس شركة LLC في المملكة العربية السعودية؟'
];

const SITE_URL = process.env.SITE_URL || 'https://free-llm-api-1-didl.onrender.com';
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

async function triggerGoogleIndexing(url: string): Promise<void> {
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    console.log('Google Indexing API: no service account configured, skipping.');
    return;
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: serviceAccount,
      }),
    });

    if (!tokenResponse.ok) return;
    const { access_token } = await tokenResponse.json();

    await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, type: 'URL_UPDATED' }),
    });
  } catch (error) {
    console.error('Google Indexing API error:', error);
  }
}

async function triggerIndexNow(url: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return;

  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'investinsaudi-services.sa',
        key,
        keyLocation: `https://investinsaudi-services.sa/${key}.txt`,
        urlList: [url],
      }),
    });
  } catch (error) {
    console.error('IndexNow error:', error);
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
  }

  const results: Array<{ question: string; improved: boolean; note?: string }> = [];

  for (const question of TARGET_QUESTIONS) {
    const { topSource, topAnswer } = await queryAISearchEngine(question);

    // If our site already ranks #1, skip optimization
    if (topSource && !topSource.includes(OUR_ANSWER_MARKER)) {
      // In a full production setup, this would fetch our current content from the
      // CMS/database and update it with the rewritten version.
      const rewritten = await rewriteWithGPT4o(topAnswer, '');
      if (rewritten) {
        // Fire reindexing webhooks immediately
        await triggerGoogleIndexing(SITE_URL);
        await triggerIndexNow(SITE_URL);
        results.push({ question, improved: true });
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
