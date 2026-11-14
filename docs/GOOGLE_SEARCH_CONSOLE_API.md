# Google Search Console data integration (development branch)

The existing verified HTML tag is independent of Google API authorization. Do not remove it.

## Current implementation
The protected `GET /api/admin/visibility?type=queries` endpoint uses a server-side OAuth refresh token to fetch the previous 28 days of query-level Search Analytics metrics (ending 3 days before current UTC date). The dashboard renders clicks, impressions, CTR, and average position only when Google returns rows. The endpoint never exposes the access token or refresh token.

## Google Cloud setup (required before enabling)
1. Open Google Cloud Console, create/select a project, enable **Google Search Console API**.
2. Configure OAuth consent screen and add the authorized Google account as a test user if the app is in testing.
3. Create an OAuth client with a controlled redirect URI. Authorize with `https://www.googleapis.com/auth/webmasters.readonly`, request offline access and obtain a refresh token using a secure authorization flow.
4. Ensure the authorizing Google account has access to the exact Search Console URL-prefix property.
5. Add these **server-side Render environment variables** (never NEXT_PUBLIC and never commit values):
   - `GSC_CLIENT_ID`
   - `GSC_CLIENT_SECRET`
   - `GSC_REFRESH_TOKEN`
   - `GSC_PROPERTY_URL=https://free-llm-api-1-didl.onrender.com/`
6. Redeploy and open the admin dashboard → SEO & AI Visibility → keywords. Do not paste any secret into chat or the public dashboard.

## Known limitations / next tasks
- OAuth consent and refresh-token acquisition are not yet implemented as a dashboard flow; this is a backend integration prepared for credentials.
- Google Search Console performance data may be delayed, sampled or limited; empty results do not necessarily mean an error.
- No live Google API call has been tested; verify after credentials are configured.
- No production merge until a build and integration test passes.
