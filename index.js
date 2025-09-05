module.exports = (app) => {
  // Handle pull request events - add auto-approval comment
  app.on("pull_request.opened", async (context) => {
    const pr = context.payload.pull_request;

    // Only process PRs from GitHub Copilot
    if (pr.user.login !== "github-copilot-agent") return;

    // Check if workflow files were modified
    const files = await context.octokit.pulls.listFiles(
      context.repo({ pull_number: pr.number })
    );

    const touchedWorkflows = files.data.some(f => f.filename.startsWith(".github/workflows/"));
    if (touchedWorkflows) {
      app.log.info(`Skipping auto-approval for PR #${pr.number} - workflow files modified`);
      return;
    }

    try {
      // Add a comment indicating auto-approval
      await context.octokit.issues.createComment(
        context.repo({
          issue_number: pr.number,
          body: "🤖 **Auto-approving Copilot PR workflows**\n\nThis PR is from GitHub Copilot and doesn't modify workflow files. Workflows should be automatically approved."
        })
      );

      app.log.info(`Added auto-approval comment to Copilot PR #${pr.number}`);
    } catch (error) {
      app.log.error(`Failed to add comment to PR #${pr.number}:`, error);
    }
  });

  // Handle workflow run events - try multiple approval approaches
  app.on("workflow_run.requested", async (context) => {
    const workflowRun = context.payload.workflow_run;
    
    // Only process workflow runs from pull requests by GitHub Copilot
    if (!workflowRun.pull_requests || workflowRun.pull_requests.length === 0) return;
    
    // Get the PR to check if it's from Copilot
    const prNumber = workflowRun.pull_requests[0].number;
    const pr = await context.octokit.pulls.get(
      context.repo({ pull_number: prNumber })
    );

    if (pr.data.user.login !== "github-copilot-agent") return;

    // Check if workflow files were modified in this PR
    const files = await context.octokit.pulls.listFiles(
      context.repo({ pull_number: prNumber })
    );

    const touchedWorkflows = files.data.some(f => f.filename.startsWith(".github/workflows/"));
    if (touchedWorkflows) {
      app.log.info(`Skipping workflow approval for PR #${prNumber} - workflow files modified`);
      return;
    }

    app.log.info(`Attempting to auto-approve workflow run ${workflowRun.id} for Copilot PR #${prNumber}`);

    // Try multiple approaches for workflow approval
    let approvalSuccess = false;

    // Approach 1: Try the approveWorkflowRun API (may not work for private repos)
    try {
      await context.octokit.actions.approveWorkflowRun(
        context.repo({
          run_id: workflowRun.id
        })
      );
      app.log.info(`✓ Approved workflow run ${workflowRun.id} via approveWorkflowRun API`);
      approvalSuccess = true;
    } catch (error) {
      app.log.warn(`⚠ approveWorkflowRun failed (expected for private repos): ${error.message}`);
    }

    // Approach 2: If API approval failed, add a PR comment with instructions
    if (!approvalSuccess) {
      try {
        await context.octokit.issues.createComment(
          context.repo({
            issue_number: prNumber,
            body: `⚡ **Workflow Approval Needed**\n\nWorkflow run \`${workflowRun.id}\` is awaiting approval.\n\n**Auto-approval attempted but requires manual action due to repository settings.**\n\nTo approve: Go to the [Actions tab](${workflowRun.html_url}) and click "Approve workflows to run".`
          })
        );
        app.log.info(`Added workflow approval reminder comment to PR #${prNumber}`);
      } catch (commentError) {
        app.log.error(`Failed to add approval reminder comment: ${commentError.message}`);
      }
    }
  });
};
