// Vercel serverless function for GitHub App webhooks

// Export Vercel serverless function
export default async function handler(req, res) {
  try {
    // Dynamic import of Probot (ES module)
    const { Probot } = await import('probot');
    
    // Dynamic import of app logic
    const appModule = await import('../index.js');
    const app = appModule.default || appModule;

    // Create Probot instance
    const probot = new Probot({
      appId: process.env.APP_ID,
      privateKey: process.env.PRIVATE_KEY,
      secret: process.env.WEBHOOK_SECRET,
    });

    // Load your app
    probot.load(app);

    // Process webhook
    await probot.webhooks.verifyAndReceive({
      id: req.headers['x-github-delivery'],
      name: req.headers['x-github-event'],
      signature: req.headers['x-github-signature-256'],
      payload: JSON.stringify(req.body),
    });
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
