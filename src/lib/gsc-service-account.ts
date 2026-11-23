import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

/** GSC read-only service-account token; never log or return credential material. */
export async function getGscServiceAccountToken(
 path: string,
 fetchToken: typeof fetch = fetch,
 nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
 let credentials: unknown;
 try { credentials = JSON.parse(await readFile(path, 'utf8')); }
 catch { throw new Error('gsc_service_account_unreadable'); }
 if (!credentials || typeof credentials !== 'object') throw new Error('gsc_service_account_invalid');
 const c = credentials as Record<string,unknown>;
 if (c.type !== 'service_account' ||
     typeof c.client_email !== 'string' || !c.client_email.endsWith('.iam.gserviceaccount.com') ||
     typeof c.private_key !== 'string' || !c.private_key.includes('BEGIN PRIVATE KEY') ||
     typeof c.token_uri !== 'string' || c.token_uri !== 'https://oauth2.googleapis.com/token')
   throw new Error('gsc_service_account_invalid');
 const header = { alg: 'RS256', typ: 'JWT' };
 const payload = {
  iss: c.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly',
  aud: 'https://oauth2.googleapis.com/token', iat: nowSeconds, exp: nowSeconds + 3600,
 };
 const encode = (value:unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
 const signingInput = encode(header) + '.' + encode(payload);
 let signature: string;
 try {
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput); signer.end();
  signature = signer.sign(c.private_key).toString('base64url');
 } catch { throw new Error('gsc_service_account_signing_failed'); }
 let response: Response;
 try {
  response = await fetchToken('https://oauth2.googleapis.com/token', {
   method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion:signingInput + '.' + signature}), cache:'no-store',
  });
 } catch { throw new Error('gsc_service_account_token_transport'); }
 if (!response.ok) throw new Error('gsc_service_account_token_' + response.status);
 let token: unknown;
 try { token = await response.json(); }
 catch { throw new Error('gsc_service_account_token_invalid'); }
 if (!token || typeof token !== 'object' ||
     typeof (token as Record<string,unknown>).access_token !== 'string' ||
     !(token as {access_token:string}).access_token)
   throw new Error('gsc_service_account_token_invalid');
 return (token as {access_token:string}).access_token;
}
