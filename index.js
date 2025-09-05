export default (app) => {
  console.log('🎯 GitHub Copilot Auto-Approver loaded');
  
  // Handle pull request events - add auto-approval comment
  app.on("pull_request.opened", async (context) => {
    console.log('📝 PR opened event received');
    const pr = context.payload.pull_request;
    
    console.log(`🔍 Checking PR #${pr.number} by ${pr.user.login}`);

    // Only process PRs from GitHub Copilot
    if (pr.user.login !== "github-copilot[bot]") {
      console.log(`⏭️ Skipping PR #${pr.number} - not from GitHub Copilot (user: ${pr.user.login})`);
      return;
    }

    console.log(`🤖 Copilot PR detected: #${pr.number} - ${pr.title}`);

    // Check if workflow files were modified
    const files = await context.octokit.pulls.listFiles(
      context.repo({ pull_number: pr.number })
    );

    const touchedWorkflows = files.data.some(f => f.filename.startsWith(".github/workflows/"));
    if (touchedWorkflows) {
      console.log(`⚠️ Skipping auto-approval for PR #${pr.number} - workflow files modified`);
      app.log.info(`Skipping auto-approval for PR #${pr.number} - workflow files modified`);
      return;
    }

    try {
      console.log(`💬 Adding auto-approval comment to PR #${pr.number}`);
      // Add a comment indicating auto-approval
      await context.octokit.issues.createComment(
        context.repo({
          issue_number: pr.number,
          body: "🤖 **Auto-approving Copilot PR workflows**\n\nThis PR is from GitHub Copilot and doesn't modify workflow files. Workflows should be automatically approved."
        })
      );

      console.log(`✅ Successfully added auto-approval comment to Copilot PR #${pr.number}`);
      app.log.info(`Added auto-approval comment to Copilot PR #${pr.number}`);
    } catch (error) {
      console.error(`❌ Failed to add comment to PR #${pr.number}:`, error);
      app.log.error(`Failed to add comment to PR #${pr.number}:`, error);
    }
  });

  // Handle workflow run events - try multiple approval approaches
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

    if (pr.data.user.login !== "github-copilot[bot]") {
      console.log(`⏭️ Skipping workflow run ${workflowRun.id} - PR #${prNumber} not from GitHub Copilot (user: ${pr.data.user.login})`);
      return;
    }

    console.log(`🤖 Copilot workflow run detected: ${workflowRun.id} for PR #${prNumber}`);

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
