// Adapter for FreeLLMAPI (OpenAI-compatible). Used as an alternative LLM provider
// for analyzeEvidence. Disabled by default via FREELLM_API_ENABLED flag.
// Base URL + key come from env (FREELLMAPI_BASE_URL, FREELLMAPI_API_KEY).

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

export async function freellmChat(messages: ChatMessage[], model?: string): Promise<{ text: string; model: string; tokens: number } | { error: string }> {
  const base = (process.env.FREELLMAPI_BASE_URL || '').replace(/\/$/, '');
  const key = process.env.FREELLMAPI_API_KEY || '';
  if (!base || !key) return { error: 'FREELLMAPI_BASE_URL or FREELLMAPI_API_KEY not configured' };
  if (process.env.FREELLMAPI_ENABLED !== 'true') return { error: 'FREELLMAPI_ENABLED is false' };
  const chosenModel = model || process.env.FREELLMAPI_MODEL || 'fusion';
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: chosenModel, messages, temperature: 0.2, response_format: { type: 'json_object' } }),
    });
    if (!res.ok) return { error: `FreeLLMAPI HTTP ${res.status}` };
    const data: any = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const tokens = data?.usage?.total_tokens || 0;
    const usedModel = data?.model || chosenModel;
    return { text, model: usedModel, tokens };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
