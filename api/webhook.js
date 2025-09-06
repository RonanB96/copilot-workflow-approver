import { createNodeMiddleware, createProbot } from 'probot';
import app from '../index.js';

// Development handler that bypasses signature verification
async function developmentHandler(req, res) {
  try {
    console.log(`🚀 Webhook received: ${req.method} ${req.url}`);

    // Create a basic probot instance for development
    const probot = createProbot({
      appId: '123456',
      privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef
-----END RSA PRIVATE KEY-----`,
      secret: 'development-secret',
    });

    // Load our app - this registers the event handlers
    app(probot);
    console.log('🎯 GitHub Copilot Auto-Approver loaded');

    // Parse the payload
    const payload = req.body;
    const eventName = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];

    console.log(`📦 Event: ${eventName}, Delivery: ${deliveryId}`);

    // Create a mock context that looks like what Probot would create
    const context = {
      id: deliveryId,
      name: eventName,
      payload,
      octokit: {
        // Mock GitHub API for development
        issues: {
          createComment: async (params) => {
            console.log('🧪 Mock: Would create comment:', params);
            return { data: { id: 1 } };
          }
        },
        pulls: {
          listFiles: async (params) => {
            console.log('🧪 Mock: Would list files:', params);
            return { data: [] };
          }
        },
        actions: {
          approveWorkflowRun: async (params) => {
            console.log('🧪 Mock: Would approve workflow run:', params);
            return { data: {} };
          }
        }
      },
      repo: (obj) => ({
        ...obj,
        owner: payload.repository?.owner?.login || 'test-owner',
        repo: payload.repository?.name || 'test-repo'
      }),
      log: console
    };

    // Also set up the app.log function to work properly
    if (probot.log) {
      probot.log.info = console.log;
      probot.log.error = console.error;
      probot.log.warn = console.warn;
    }

    // Manually trigger the event handlers by using the webhook system
    console.log(`🔥 Attempting to trigger event: ${eventName}`);

    // Try different approaches to trigger the event
    if (probot.webhooks && probot.webhooks.emit) {
      console.log('✨ Using probot.webhooks.emit...');
      try {
        await probot.webhooks.emit({
          id: deliveryId,
          name: eventName,
          payload
        });
        console.log(`✅ Event ${eventName} emitted via webhooks.emit`);
      } catch (err) {
        console.log('❌ webhooks.emit failed:', err.message);
      }
    } else if (probot.receive) {
      console.log('✨ Using probot.receive...');
      try {
        await probot.receive({
          id: deliveryId,
          name: eventName,
          payload
        });
        console.log(`✅ Event ${eventName} received via probot.receive`);
      } catch (err) {
        console.log('❌ probot.receive failed:', err.message);
      }
    } else {
      console.log('❌ No suitable event triggering method found');
      console.log('🔍 Available probot methods:', Object.keys(probot));
    }

    console.log('✅ Webhook processed successfully');
    res.status(200).json({ ok: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Production middleware with debugging
const productionMiddleware = createNodeMiddleware(app, {
  probot: createProbot({
    appId: process.env.APP_ID,
    privateKey: process.env.PRIVATE_KEY,
    secret: process.env.WEBHOOK_SECRET,
  }),
  webhookPath: '/api/webhook'
});

// Wrap the production middleware to add logging
const wrappedProductionMiddleware = async (req, res) => {
  console.log(`🚀 Production webhook received: ${req.method} ${req.url}`);
  console.log(`📋 Headers:`, {
    'x-github-event': req.headers['x-github-event'],
    'x-github-delivery': req.headers['x-github-delivery'],
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']
  });
  
  try {
    await productionMiddleware(req, res);
    console.log(`✅ Production webhook processed successfully`);
  } catch (error) {
    console.error(`❌ Production webhook error:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Production webhook error', details: error.message });
    }
  }
};

// Export the appropriate handler based on environment
export default process.env.NODE_ENV !== 'production' ? developmentHandler : wrappedProductionMiddleware;
