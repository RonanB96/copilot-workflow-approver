// api/github/webhooks/index.js
import { createNodeMiddleware, createProbot } from "probot";
import app from "../index.js";

export default await createNodeMiddleware(app, {
  probot: createProbot(),
  webhooksPath: "/api/webhook",
});
