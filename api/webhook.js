import { createNodeMiddleware, createProbot } from 'probot';
import app from '../index.js';

// Create middleware with proper configuration for development
export default createNodeMiddleware(app, {
  probot: createProbot({
    appId: process.env.APP_ID || '123456',
    privateKey: process.env.PRIVATE_KEY || `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef
-----END RSA PRIVATE KEY-----`,
    secret: process.env.WEBHOOK_SECRET || 'development-secret',
  }),
  webhookPath: '/api/webhook'
});
