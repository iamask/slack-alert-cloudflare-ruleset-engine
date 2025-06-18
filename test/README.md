# Alert Action Automation

A Cloudflare Worker that monitors Security events/ Rulesets and automatically blocks malicious JA4 fingerprints.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/iamask/slack-alert-cloudflare-ruleset-engine)

## Features

- Monitors Security events using Cloudflare's GraphQL API
- Sends alerts to Slack when events are detected
- Automatically blocks malicious JA4 fingerprints (optional)
- State management using KV to prevent duplicate alerts
- Configurable through environment variables and secrets

## Prerequisites

- Cloudflare account with API access
- Cloudflare Workers subscription
- Slack workspace with webhook URL
- Cloudflare API Token with appropriate permissions

## Deployment

### Option 1: Deploy Button (Recommended)

1. Click the "Deploy to Cloudflare" button above
2. Create Workers KV and add bindings to worker as `ALERTS_KV`
3. Update Variables and secrets in the Cloudflare dashboard

![Screenshot](https://r2.zxc.co.in/git_readme/slack-alert-dash.png)

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

3. Create KV Namespace (Required for state management):

   **Option A: Using Cloudflare Dashboard**

   1. Go to Workers & Pages > KV
   2. Click "Create a namespace"
   3. Name it "ALERTS_KV"
   4. Copy the namespace ID

   **Option B: Using Wrangler CLI**

   ```bash
   wrangler kv:namespace create "ALERTS_KV"
   ```

   This will output something like:

   ```bash
   Add the following to your wrangler.jsonc:
   {
     "kv_namespaces": [
       {
         "binding": "ALERTS_KV",
         "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
       }
     ]
   }
   ```

4. Configure your environment variables and secrets:

   **Required Variables:**

   - `API_TOKEN`: Your Cloudflare API Token
   - `ZONE_TAG`: Your Cloudflare Zone Tag
   - `ZONE_ID`: Your Cloudflare Zone ID
   - `RULESET_ID`: Ruleset ID for monitoring
   - `SLACK_WEBHOOK_URL`: Your Slack Webhook URL

   **Optional Variables:**

   - `AUTO_BLOCK`: Set to `true` to enable automatic blocking
   - `CUSTOM_RULE_ID`: Required when `AUTO_BLOCK` is enabled
   - `RULE_ID`: Optional rule ID to filter events

   Configure these in either:

   - Cloudflare Dashboard > Workers > Your Worker > Variables
   - Or using Wrangler secrets:
     ```bash
     wrangler secret bulk .env.vars
     or
     wrangler secret put API_TOKEN
     wrangler secret put SLACK_WEBHOOK_URL
     # ... repeat for other sensitive variables
     ```

5. Update `wrangler.jsonc` with your configuration:

   ```jsonc
   {
   	"name": "worker-name",
   	"main": "src/index.js",
   	"compatibility_date": "2025-06-10",
   	"kv_namespaces": [
   		{
   			"binding": "ALERTS_KV",
   			"id": "your-kv-namespace-id" // Use the ID from step 3
   		}
   	],
   	"vars": {
   		"AUTO_BLOCK": false // Set to true to enable automatic blocking
   	},
   	"triggers": {
   		"crons": [
   			"*/30 * * * *" // Runs every 30 minutes
   		]
   	}
   }
   ```

6. Deploy the worker:
   ```bash
   wrangler deploy
   ```

## How It Works

1. The worker runs every 30 minutes (configurable via cron trigger)
2. It queries the last 24 hours of firewall events using Cloudflare's GraphQL API
3. When new events are detected:
   - Sends an alert to Slack with event details
   - If AUTO_BLOCK is enabled, identifies the top 3 malicious JA4 fingerprints
   - Creates a blocking rule for the identified JA4 fingerprints
4. Uses KV to maintain state and prevent duplicate alerts

## Security Considerations

- The worker requires appropriate API token permissions
- Automatic blocking can be disabled by setting `AUTO_BLOCK` to false
- Blocking rules are created with a 403 response and JSON error message
- All sensitive operations are logged for audit purposes

## Alert Format

![Screenshot](https://r2.zxc.co.in/git_readme/alert-slack.png)

## License

MIT License - feel free to use this code for your own projects.
