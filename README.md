# Alert Action Automation

A Cloudflare Worker that monitors Security events/ Rulesets and automatically blocks malicious JA4 fingerprints.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/iamask/slack-alert-cloudflare-ruleset-engine)

## Features

- Monitors DDoS events using Cloudflare's GraphQL API
- Sends alerts to Slack when events are detected
- Automatically blocks malicious JA4 fingerprints (optional)
- State management to prevent duplicate alerts
- Configurable through environment variables

## Deployment

### Option 1: Deploy Button (Recommended)

Simply click the "Deploy to Cloudflare" button above to deploy this worker to your Cloudflare account.

### Option 2: Manual Deployment

If you prefer to deploy manually:

1. Clone this repository:
   ```bash
   git clone https://github.com/iamask/slack-alert-cloudflare-ruleset-engine.git
   cd slack-alert-cloudflare-ruleset-engine
   ```
2. Install Wrangler CLI:
   ```bash
   npm i -D wrangler@latest
   ```
3. Configure your environment variables in `wrangler.jsonc` and [Secrets](https://developers.cloudflare.com/workers/configuration/environment-variables/#compare-secrets-and-environment-variables) or through the Cloudflare dashboard
4. Deploy the worker:
   ```bash
   wrangler deploy
   ```

## Required Environment Variables

The following environment variables are required for the worker to function:

- `API_TOKEN`: Your Cloudflare API Token
- `ZONE_TAG`: Your Cloudflare Zone Tag
- `ZONE_ID`: Your Cloudflare Zone ID
- `RULESET_ID`: Ruleset ID for monitoring
- `SLACK_WEBHOOK_URL`: Your Slack Webhook URL

Optional variables:

- `AUTO_BLOCK`: Set to `true` to enable automatic blocking of malicious JA4 fingerprints
- `CUSTOM_RULE_ID`: Required when `AUTO_BLOCK` is enabled
- `RULE_ID`: Optional rule ID to filter events (if not provided, all rules within the ruleset will be checked)

## License

MIT License - feel free to use this code for your own projects.

## Prerequisites

- Cloudflare account with API access
- Cloudflare Workers subscription
- Slack workspace with webhook URL
- Cloudflare API Token with appropriate permissions

![Screenshot](https://r2.zxc.co.in/git_readme/slack-alert-dash.png)

## How It Works

1. The worker runs on a scheduled basis (configured in Cloudflare)
2. It queries the last 24 hours of firewall events using Cloudflare's GraphQL API
3. When new events are detected:
   - Sends an alert to Slack with event details
   - If AUTO_BLOCK is enabled, identifies the top 3 malicious JA4 fingerprints
   - Creates a blocking rule for the identified JA4 fingerprints
4. Maintains state to prevent duplicate alerts and actions

## Security Considerations

- The worker requires appropriate API token permissions
- Automatic blocking can be disabled by setting `AUTO_BLOCK` to false
- Blocking rules are created with a 403 response and JSON error message
- All sensitive operations are logged for audit purposes

## Monitoring

The worker logs important events and actions:

- Alert sending attempts and results
- Blocking rule creation attempts
- Error conditions and failures
- Top JA4 fingerprints detected

## Alert Format

![Screenshot](https://r2.zxc.co.in/git_readme/alert-slack.png)
