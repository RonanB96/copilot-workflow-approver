export default (app) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const log = isDev ? console.log : app.log.info;

  log('🎯 GitHub Copilot Auto-Approver loaded');

  // List of known Copilot usernames
  const COPILOT_USERNAMES = [
    'github-copilot[bot]',
    'copilot-swe-agent',
    'Copilot',
    'github-copilot'
  ];

  function isCopilotUser(username) {
    return COPILOT_USERNAMES.includes(username);
  }

  // Generic handler for all pull_request actions
  app.on("pull_request", async (context) => {
    const pr = context.payload.pull_request;
    log(`📝 pull_request event: action=${context.payload.action}, PR #${pr?.number}, user=${pr?.user?.login}`);

    if (!pr || !pr.user || !COPILOT_USERNAMES.includes(pr.user.login)) {
      log(`⏭️ Skipping PR: not a Copilot user (${pr?.user?.login})`);
      return;
    }

    log(`🤖 Copilot PR detected: #${pr.number} - ${pr.title}`);
    // ...existing code for workflow approval...
  });

  // Optionally, add more logging for other events
  app.onAny(async (event) => {
    log(`🔔 Event received: ${event.name}`);
  });  // Handle workflow run events - try multiple approval approaches
  app.on("workflow_run.requested", async (context) => {
    console.log('⚡ Workflow run requested event received');
    const workflowRun = context.payload.workflow_run;

    console.log(`🔍 Checking workflow run ${workflowRun.id} for workflow ${workflowRun.name}`);

    // Only process workflow runs from pull requests by GitHub Copilot
    if (!workflowRun.pull_requests || workflowRun.pull_requests.length === 0) {
      console.log(`⏭️ Skipping workflow run ${workflowRun.id} - no associated PR`);
      return;
    }

    // Get the PR to check if it's from Copilot
    const prNumber = workflowRun.pull_requests[0].number;
    console.log(`🔗 Workflow run ${workflowRun.id} linked to PR #${prNumber}`);

    const pr = await context.octokit.pulls.get(
      context.repo({ pull_number: prNumber })
    );

    if (!isCopilotUser(pr.data.user.login)) {
      console.log(`⏭️ Skipping workflow run ${workflowRun.id} - PR #${prNumber} not from GitHub Copilot (user: ${pr.data.user.login})`);
      return;
    }

    console.log(`🤖 Copilot workflow run detected: ${workflowRun.id} for PR #${prNumber} (by ${pr.data.user.login})`);

    // Check if workflow files were modified in this PR
    const files = await context.octokit.pulls.listFiles(
      context.repo({ pull_number: prNumber })
    );

    const touchedWorkflows = files.data.some(f => f.filename.startsWith(".github/workflows/"));
    if (touchedWorkflows) {
      console.log(`⚠️ Skipping workflow approval for PR #${prNumber} - workflow files modified`);
      app.log.info(`Skipping workflow approval for PR #${prNumber} - workflow files modified`);
      return;
    }

    console.log(`🚀 Attempting to auto-approve workflow run ${workflowRun.id} for Copilot PR #${prNumber}`);
    app.log.info(`Attempting to auto-approve workflow run ${workflowRun.id} for Copilot PR #${prNumber}`);

    // Try multiple approaches for workflow approval
    let approvalSuccess = false;

    // Approach 1: Try the approveWorkflowRun API (may not work for private repos)
    try {
      console.log(`🔑 Trying approveWorkflowRun API for run ${workflowRun.id}`);
      await context.octokit.actions.approveWorkflowRun(
        context.repo({
          run_id: workflowRun.id
        })
      );
      console.log(`✅ Successfully approved workflow run ${workflowRun.id} via API`);
      app.log.info(`✓ Approved workflow run ${workflowRun.id} via approveWorkflowRun API`);
      approvalSuccess = true;
    } catch (error) {
      console.log(`⚠️ approveWorkflowRun API failed for run ${workflowRun.id}: ${error.message}`);
      app.log.warn(`⚠ approveWorkflowRun failed (expected for private repos): ${error.message}`);
    }

    // Approach 2: If API approval failed, add a PR comment with instructions
    if (!approvalSuccess) {
      try {
        console.log(`💬 Adding workflow approval reminder comment to PR #${prNumber}`);
        await context.octokit.issues.createComment(
          context.repo({
            issue_number: prNumber,
            body: `⚡ **Workflow Approval Needed**\n\nWorkflow run \`${workflowRun.id}\` is awaiting approval.\n\n**Auto-approval attempted but requires manual action due to repository settings.**\n\nTo approve: Go to the [Actions tab](${workflowRun.html_url}) and click "Approve workflows to run".`
          })
        );
        console.log(`✅ Successfully added workflow approval reminder comment to PR #${prNumber}`);
        app.log.info(`Added workflow approval reminder comment to PR #${prNumber}`);
      } catch (commentError) {
        console.error(`❌ Failed to add approval reminder comment to PR #${prNumber}:`, commentError);
        app.log.error(`Failed to add approval reminder comment: ${commentError.message}`);
      }
    }
  });
};
