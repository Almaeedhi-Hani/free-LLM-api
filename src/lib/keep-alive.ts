/**
 * Keep-Alive Utility
 *
 * Periodically pings the server to prevent it from going into sleep mode
 * on free hosting tiers (like Render, Koyeb, etc.).
 */

export function startKeepAlive(url: string, intervalMinutes: number = 10) {
  if (typeof window !== 'undefined') return; // Only run on server-side

  console.log(`Keep-Alive: Starting pinger for ${url} every ${intervalMinutes} minutes.`);

  setInterval(async () => {
    try {
      const response = await fetch(url);
      console.log(`Keep-Alive Ping: Sent to ${url} at ${new Date().toISOString()} - Status: ${response.status}`);
    } catch (error) {
      console.error(`Keep-Alive Error: Failed to ping ${url}`, error);
    }
  }, intervalMinutes * 60 * 1000);
}
