# Alert Action Automation

A Cloudflare Worker that monitors DDoS events and automatically blocks malicious JA4 fingerprints.

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
3. Configure your environment variables in `wrangler.jsonc` or through the Cloudflare dashboard
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

## Manual Setup

If you prefer to set up manually:

1. Clone this repository:
   ```bash
   git clone https://github.com/iamask/slack-alert-cloudflare-ruleset-engine.git
   cd slack-alert-cloudflare-ruleset-engine
   ```
2. Install Wrangler CLI: `npm install -g wrangler`
3. Configure your environment variables in `.env.vars` or through the Cloudflare dashboard
4. Deploy using Wrangler: `wrangler deploy`

## Configuration

The worker can be configured through environment variables in the Cloudflare dashboard or using `.env.vars` file:

```bash
# Required variables
API_TOKEN=your_api_token
ZONE_TAG=your_zone_tag
ZONE_ID=your_zone_id
RULESET_ID=your_ruleset_id
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Optional variables
AUTO_BLOCK=true
CUSTOM_RULE_ID=your_custom_rule_id
RULE_ID=your_rule_id
```

## License

MIT License - feel free to use this code for your own projects.

## Prerequisites

- Cloudflare account with API access
- Cloudflare Workers subscription
- Slack workspace with webhook URL
- Cloudflare API Token with appropriate permissions

## Environment Variables

The following environment variables need to be configured in your Cloudflare Workers dashboard or `wrangler.jsonc` and [Secrets](https://developers.cloudflare.com/workers/configuration/environment-variables/#compare-secrets-and-environment-variables):

- `API_TOKEN`: Your Cloudflare API token
- `ZONE_TAG`: Your Cloudflare zone tag
- `ZONE_ID`: Your Cloudflare zone ID
- `SLACK_WEBHOOK_URL`: Slack webhook URL for alerts
- `AUTO_BLOCK`: Boolean flag to enable/disable automatic blocking (true/false)
- `RULESET_ID`: Your Cloudflare Ruleset ID for DDoS monitoring (Required)
- `RULE_ID`: Optional specific rule ID to monitor within the ruleset
- `CUSTOM_RULE_ID`: Ruleset ID where blocking rules will be created (Required if AUTO_BLOCK is enabled)

![Screenshot](https://r2.zxc.co.in/git_readme/slack-alert-dash.png)

## Setup

1. Clone this repository
2. Install Wrangler CLI if you haven't already:
   ```bash
   npm i -D wrangler@latest
   ```
3. Configure your environment variables in `wrangler.jsonc` or through the Cloudflare dashboard
4. Deploy the worker:
   ```bash
   wrangler deploy
   ```

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
