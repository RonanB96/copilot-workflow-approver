# Copilot Auto-Approve GitHub App

This GitHub App automatically approves workflow runs for pull requests created by GitHub Copilot, eliminating the need for manual approval.

## How it works

- Listens for `pull_request.opened` and `workflow_run.requested` events
- Only processes PRs created by `github-copilot-agent`
- Skips auto-approval if the PR modifies workflow files (`.github/workflows/*`)
- Uses the GitHub Actions API to approve workflow runs automatically

## Setup

1. **Deploy the app** using a service like Vercel, Railway, or your own server:

   ```bash
   npm install
   npm start
   ```

2. **Create a GitHub App**:
   - Go to GitHub Settings > Developer settings > GitHub Apps
   - Click "New GitHub App"
   - Use the `app.yml` manifest or set permissions manually:
     - Pull requests: Read
     - Actions: Write
     - Metadata: Read
   - Subscribe to events: `pull_request` and `workflow_run`

3. **Install the app** on your repository

4. **Configure environment variables**:

   ```bash
   GITHUB_APP_ID=your_app_id
   GITHUB_PRIVATE_KEY=your_private_key
   GITHUB_WEBHOOK_SECRET=your_webhook_secret
   ```

## Security

The app only auto-approves workflow runs when:

- The PR is created by `github-copilot-agent`
- No workflow files are modified in the PR
- This prevents malicious workflow modifications while allowing safe CI runs

## Required Permissions

- **Pull requests**: Read access to get PR details and files
- **Actions**: Write access to approve workflow runs
- **Metadata**: Read access for repository information
