// api/github/webhooks/index.js
import { createNodeMiddleware, createProbot } from "probot";
import app from "../index.js";

// Create middleware with logging
const middleware = await createNodeMiddleware(app, {
  probot: createProbot(),
  webhooksPath: "/api/webhook",
});

// Wrap with custom logging
export default async function handler(req, res) {
  console.log(`🚀 Webhook received: ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, {
    'x-github-event': req.headers['x-github-event'],
    'x-github-delivery': req.headers['x-github-delivery'],
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']
  });
  
  if (req.body) {
    console.log(`📦 Payload preview:`, {
      action: req.body.action,
      repository: req.body.repository?.full_name,
      sender: req.body.sender?.login,
      pull_request: req.body.pull_request ? {
        number: req.body.pull_request.number,
        title: req.body.pull_request.title,
        user: req.body.pull_request.user?.login
      } : undefined
    });
  }

  try {
    // Call the Probot middleware
    await new Promise((resolve, reject) => {
      middleware(req, res, (err) => {
        if (err) {
          console.error('❌ Middleware error:', err);
          reject(err);
        } else {
          console.log('✅ Webhook processed successfully');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
