# Telegram voice free-only provider setup

Voice remains off unless TELEGRAM_OPS_VOICE_ENABLED=true and advanced operations are enabled. Use dedicated credentials. Each provider must be explicitly opted in only after checking its account-side hard stop; a flag is an operator attestation, not remote billing verification.

Priority:
1. Qwen3-ASR-Flash (Singapore): TELEGRAM_VOICE_QWEN_KEY, TELEGRAM_VOICE_QWEN_WORKSPACE, TELEGRAM_VOICE_QWEN_FREE_UNTIL (UTC ISO seconds, actual expiry), TELEGRAM_VOICE_QWEN_FREE_ONLY=true. Verify model access and actual free quota and enable Free Quota Only in Alibaba Cloud. Do not enable otherwise.
2. Groq Whisper: TELEGRAM_VOICE_GROQ_KEY, TELEGRAM_VOICE_GROQ_FREE_ONLY=true. Dedicated free-plan account, not paid tier.
3. Cloudflare Workers AI Whisper: TELEGRAM_VOICE_CLOUDFLARE_KEY, TELEGRAM_VOICE_CLOUDFLARE_ACCOUNT, TELEGRAM_VOICE_CLOUDFLARE_FREE_ONLY=true. Workers Free account, no paid overage.

No automatic paid plan or upgrade. No fixed hourly or daily recording count. Maximum 120 seconds/4 MiB per recording. Each Telegram update and provider attempt has a separate durable claim; repeats are not processed. Account-side free-tier quota enforcement determines when providers refuse requests; local flags do not independently verify billing settings. Longer transcripts are explicitly marked if truncated. Explicit refusal (401/402/403/429) permits next configured provider; ambiguous network or processing errors stop. Audio bytes only, never Telegram file URL; no persisted audio in this app. Provider processing and retention policies apply. No automatic command execution.

Additional candidates: Gemini audio documents OGG Vorbis, not Telegram's Opus; require codec compatibility testing or conversion and free-project verification. Deepgram/AssemblyAI and other signup credits are finite, not recurring free plans; exclude unless independently verified hard stop. Self-hosted Qwen ASR is open-weight but compute costs are not guaranteed free. No external calls or account changes in CI. Live acceptance requires configured keys, actual provider free account confirmation and owner test recording.
