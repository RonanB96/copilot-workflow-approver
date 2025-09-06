export default (app) => {
  console.log('🎯 Simple test app loaded');
  
  // Generic pull_request handler
  app.on("pull_request", async (context) => {
    console.log(`🔥 GENERIC pull_request event! Action: ${context.payload.action}`);
  });
  
  // Specific handlers  
  app.on("pull_request.opened", async (context) => {
    console.log('📝 PR opened event received');
  });
  
  app.on("pull_request.synchronize", async (context) => {
    console.log('🔄 PR synchronize event received');
  });
};
