# Telegram Operations Room — phase 1
The foundation is disabled by default. The production scheduler, business decisions and publication rules are unchanged.

## Configuration (Render runtime secrets only)
- TELEGRAM_OPS_ENABLED=true (set last)
- TELEGRAM_BOT_TOKEN: create a dedicated bot in @BotFather.
- TELEGRAM_OWNER_CHAT_ID and TELEGRAM_OWNER_USER_ID: the verified owner's identical positive private chat and user IDs. Never use a group or public channel.
- TELEGRAM_WEBHOOK_SECRET: generate a unique cryptographically random 32–256 character URL-safe secret.

Set the webhook via Telegram Bot API setWebhook using https://free-llm-api-1-didl.onrender.com/api/telegram/operations, secret_token matching the runtime secret, and allowed_updates=["message"]. Do not paste tokens in chat, GitHub, shell history, or logs. Verify getWebhookInfo and send /start from the authorized account. Test unauthorized requests and verify /status, /brief, /market, /opportunities, /published, /reviews, /advice. Disable the feature immediately if the destination is wrong.

## Implemented
Authenticated private text commands, bounded request payload, plain-text responses, read-only data sources, explicit missing-data wording, verified weekly report marker, rule-based advice and message length handling. No customer personal data, raw errors, credentials or unrestricted queries. Duplicate webhook delivery can repeat read-only messages; no business mutations are possible.

## Remaining phases
- Durable event deduplication and audit history; daily briefing and failure-only alerts integrated with the central scheduler without adding independent cron.
- Verify Watchdog source, independent freshness checks, measured health, and publication types.
- Strategic memory with explicit decisions and source references.
- Interactive approvals through existing review gates, exact-item confirmation, expiry, idempotency and audit trail.
- Voice transcription with explicit provider choice and limits; no voice action until confirmed in text.
- Coordinator and specialized agents using existing quotas and operational gates, with no autonomous code or deployment commands.
- Live end-to-end test after credentials are configured. No claim of an active bot before a verified Telegram message.
