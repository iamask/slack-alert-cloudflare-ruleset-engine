# Alert Action Automation Worker

A Cloudflare Worker that monitors DDoS events and automatically blocks malicious JA4 fingerprints based on detected patterns. This worker helps protect your Cloudflare zone by identifying and responding to potential DDoS attacks in real-time.

## Features

- Monitors DDoS events in real-time using Cloudflare's GraphQL API
- Sends alerts to Slack when suspicious activity is detected
- Automatically blocks top malicious JA4 fingerprints (when enabled)
- Maintains state to prevent duplicate alerts
- Configurable blocking behavior through environment variables

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
