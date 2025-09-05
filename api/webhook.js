// Vercel serverless function for GitHub App webhooks
const { Probot } = require('probot');

// Import your app logic
const app = require('../index.js');

// Create Probot instance
const probot = new Probot({
  appId: process.env.APP_ID,
  privateKey: process.env.PRIVATE_KEY,
  secret: process.env.WEBHOOK_SECRET,
});

// Load your app
probot.load(app);

// Export Vercel serverless function
module.exports = async (req, res) => {
  await probot.webhooks.verifyAndReceive({
    id: req.headers['x-github-delivery'],
    name: req.headers['x-github-event'],
    signature: req.headers['x-github-signature-256'],
    payload: JSON.stringify(req.body),
  });
  
  res.status(200).json({ ok: true });
};
