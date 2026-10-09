import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleFeedRequest } from './_lib/feed.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const url = typeof req.query.url === 'string' ? req.query.url : null;
  const result = await handleFeedRequest(url);
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(result.body);
}
