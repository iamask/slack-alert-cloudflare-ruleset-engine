// Get time window for last 24 hours...
const getTimeWindow = () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
        start: twentyFourHoursAgo.toISOString(),
        end: now.toISOString()
    };
};

// Validate required environment variables
const validateEnv = (env) => {
    const requiredVars = {
        'API_TOKEN': 'Cloudflare API Token',
        'ACCOUNT_ID': 'Account Tag (Account ID)',
        'RULESET_ID': 'Default HTTP DDPS Ruleset ID',
        'SLACK_WEBHOOK_URL': 'Slack Webhook URL'
    };

    const missingVars = [];
    for (const [varName, description] of Object.entries(requiredVars)) {
        if (!env[varName]) {
            missingVars.push(`${varName} (${description})`);
        }
    }

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables:${missingVars.join('\n')}`);
    }
    console.log('Environment validation completed successfully');
};

// Simple hash function for state comparison
// use 128 characters of the base64 encoded string
const getSimpleHash = (data) => btoa(JSON.stringify(data)).slice(0, 128);

// Send alert to Slack
// Slack has string length limits, so we need to truncate the events data in graphql query like top 3
const sendAlert = async (events, accountTag, env) => {
    const message = {
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🚨 DDoS Events Detected on Account 🚨 `
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: JSON.stringify(events, null, 2)
                }
            }
        ]
    };

    try {
        const response = await fetch(env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            throw new Error(`Slack webhook failed: ${response.status}`);
        }
    } catch (error) {
        throw new Error(`Failed to send Slack alert: ${error.message}`);
    }
};

// here all my DDoS override rule names starts with "page%" ; % is a wildcard
// DDoS override rules cannot be filtered by ruleId_like, so we need to filter by description_like which is easier to implement
export default {
    async scheduled(request, env, ctx) {
        try {
            validateEnv(env);
            const timeWindow = getTimeWindow();
            const query = `
                query Viewer {
                    viewer {
                        accounts(filter: { accountTag: "${env.ACCOUNT_ID}" }) {
                            accountTag
                            firewallEventsAdaptiveGroups(
                                filter: {
                                    datetime_geq: "${timeWindow.start}"
                                    datetime_leq: "${timeWindow.end}"
                                    OR: [
                                        { description_like: "pages%" }
                                        { rulesetId_like: "${env.RULESET_ID}" }
                                    ]
                                }
                                orderBy: [count_DESC]
                                limit: 5
                            ) {
                                count
                                dimensions {
                                    description
                                    clientCountryName
                                    clientAsn
                                    clientIP
                                    ja4
                                    clientRequestPath
                                    clientRequestHTTPHost
                                    botDetectionTags
                                }
                            }
                        }
                    }
                }
            `;

            // Get events from GraphQL
            const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`GraphQL API request failed with status ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('GraphQL response received');
            console.log('GraphQL response data:', JSON.stringify(data, null, 2));
            
            if (data.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
            }

            const events = data.data?.viewer?.accounts[0]?.firewallEventsAdaptiveGroups || [];
            console.log(`Found ${events.length} events`);

            if (events.length === 0) {
                console.log(JSON.stringify({ status: 'success', message: 'No events found' }));
            }

            // Check if we need to process these events
            const previousHash = await env.ALERTS_KV.get("DdosAlertState");
            const currentHash = getSimpleHash(events);
            
            console.log('Previous hash:', previousHash);
            console.log('Current hash:', currentHash);
            console.log('Hash comparison result:', previousHash === currentHash);
            
            if (previousHash === currentHash) {
                console.log(JSON.stringify({ status: 'success', message: 'No new events' }));
                return; // Add return to prevent further processing
            }

            // Process new events
            await env.ALERTS_KV.put("DdosAlertState", currentHash);
            console.log('New events processed');
            
            try {
                await sendAlert(events, env.ACCOUNT_ID, env);
                console.log('Alert sent successfully to Slack');
            } catch (error) {
                console.error('Failed to send alert:', error);
                // Continue processing even if alert fails
            }

        } catch (error) {
            console.log(JSON.stringify({
                status: 'error',
                message: error.message
            }));
        }
    },
};
