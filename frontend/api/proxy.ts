import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lambdaUrl = process.env.LAMBDA_URL;
  const apiSecret = process.env.API_SECRET;

  if (!lambdaUrl || !apiSecret) {
    return res.status(500).json({ error: 'Server misconfigured — missing LAMBDA_URL or API_SECRET' });
  }

  const rawPath = req.query.path;
  const path = Array.isArray(rawPath) ? rawPath.join('/') : rawPath ?? '';
  const targetUrl = `${lambdaUrl}/${path}`;

  const headers: Record<string, string> = {
    'x-webhook-secret': apiSecret,
  };
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const body = await response.text();
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    return res.status(response.status).send(body);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach backend', detail: String(err) });
  }
}
