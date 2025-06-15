// This Block functionality is controlled by the AUTO_BLOCK flag 
// Setup AUTO_BLOCK  flag to true and Setup Slack URL in wrangler.jsonc or dashboard > 'Variables and Secrets' to enable automatic blocking of JA4s


//Substitue ruleset ID with your own
//https://developers.cloudflare.com/ruleset-engine/basic-operations/view-rulesets/#view-available-rulesets
const rlrulesetId = "890ec27b8b5642d3b548d5fcc557e7d5";
 

 

 
// Get time window for last 24 hours
const getTimeWindow = () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
        start: twentyFourHoursAgo.toISOString(),
        end: now.toISOString()
    };
};
 
// KV Key for state comparison
const getStateKey = (rulesetId) => `state_${rulesetId}`;
 
// Simple hash function for state comparison
const getSimpleHash = (data) => btoa(JSON.stringify(data)).slice(0, 32);
 
// Send alert to Slack
const sendAlert = async (events, zoneTag, env) => {
    const message = {
        text: `🚨 DDoS Events Detected on ${zoneTag} 🚨`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*🚨 DDoS Events Detected on ${zoneTag} | Time: ${new Date().toISOString()}*`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Events Data:*\n\`\`\`${JSON.stringify(events, null, 2)}\`\`\``
                }
            }
        ]
    };

    try {
        console.log('Sending alert to Slack with payload:', JSON.stringify(message, null, 2));
        const response = await fetch(env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`Slack webhook failed with status: ${response.status}, response: ${responseText}`);
        }
        console.log('Alert sent successfully to Slack');
    } catch (error) {
        console.error('Failed to send alert to Slack:', error);
        throw error; // Re-throw to handle in the calling function
    }
};
 
export default {
    async scheduled(request, env, ctx) {
        // AUTO_BLOCK is passed as a boolean from wrangler.jsonc
        const AUTO_BLOCK = env.AUTO_BLOCK;  
        
        // Get ruleset ID from environment variables
		// RULE_ID is optional, if not provided, all rules within the ruleset will be checked
        if (!env.RULESET_ID) {
            throw new Error('RULESET_ID environment variable is not configured');
        }

        const timeWindow = getTimeWindow();
        const query = `
            query Viewer {
                viewer {
                    zones(filter: { zoneTag: "${env.ZONE_TAG}" }, limit: 1) {
                        zoneTag
                        firewallEventsAdaptiveGroups(
                            filter: {
                                datetime_geq: "${timeWindow.start}",
                                datetime_leq: "${timeWindow.end}"
                                ${env.RULE_ID ? `ruleId: "${env.RULE_ID}",` : ''}
                                rulesetId: "${env.RULESET_ID}"
                            }
                            orderBy: [count_DESC]
                            limit: 10
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

        try {
            // Get events from GraphQL
            const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            const data = await response.json();
            const events = data.data?.viewer?.zones[0]?.firewallEventsAdaptiveGroups || [];

            if (events.length === 0) {
                return new Response(JSON.stringify({ status: 'success', message: 'No events found' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Check if we need to process these events
            const previousHash = await env.ALERTS_KV.get(getStateKey(env.RULESET_ID));
            const currentHash = getSimpleHash(events);
            
            if (previousHash === currentHash) {
                return new Response(JSON.stringify({ status: 'success', message: 'No new events' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Process new events
            await env.ALERTS_KV.put(getStateKey(env.RULESET_ID), currentHash);
            
            try {
                console.log('Attempting to send alert...');
                await sendAlert(events, env.ZONE_TAG, env);
                console.log('Alert sent successfully');
            } catch (error) {
                console.error('Failed to send alert:', error);
                // Continue processing even if alert fails
            }

            // Get top JA4s - events are already sorted by count_DESC from GraphQL
            const ja4Counts = new Map(); // Using Map to maintain insertion order
            for (const event of events) {
                const ja4 = event.dimensions.ja4;
                if (ja4 && ja4.trim() !== '') {
                    // Only add if we haven't seen this JA4 before (since events are sorted by count)
                    if (!ja4Counts.has(ja4)) {
                        ja4Counts.set(ja4, event.count);
                        // Stop once we have 3 unique JA4s
                        if (ja4Counts.size === 3) break;
                    }
                }
            }

            // Convert Map to array of top JA4s
            const topJa4s = Array.from(ja4Counts.entries())
                .map(([ja4, count]) => ({ ja4, count }));

            console.log('Top JA4s found:', topJa4s);

            let blockingResult = null;
            // Only block if AUTO_BLOCK is enabled
            if (AUTO_BLOCK && topJa4s.length > 0) {
                console.log('AUTO_BLOCK is enabled - proceeding with blocking');
                const ja4List = topJa4s.map(item => item.ja4);
                const ja4Set = ja4List.map(ja4 => `"${ja4}"`).join(" ");
                const totalCount = topJa4s.reduce((sum, item) => sum + item.count, 0);

                const blockRule = {
                    action: "block",
                    action_parameters: {
                        response: {
                            content: "{\n  \"success\": false,\n  \"error\": \"you have been blocked\"\n}",
                            content_type: "application/json",
                            status_code: 403
                        }
                    },
                    description: `Block top ${topJa4s.length} bad fingerprints (${totalCount} total requests)`,
                    enabled: true,
                    expression: `(cf.bot_management.ja4 in {${ja4Set}})`
                };

                try {
                    if (!env.CUSTOM_RULE_ID) {
                        throw new Error('CUSTOM_RULE_ID environment variable is not configured for blocking ruleset');
                    }

                    console.log('Creating blocking rule for JA4s:', ja4List);
                    console.log('Blocking expression:', blockRule.expression);
                    
                    const blockResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/rulesets/${env.CUSTOM_RULE_ID}/rules`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${env.API_TOKEN}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(blockRule)
                    });
                    blockingResult = await blockResponse.json();
                } catch (error) {
                    console.error('Failed to block JA4s:', error);
                    blockingResult = { error: error.message };
                }
            } else {
                console.log('AUTO_BLOCK is disabled - skipping blocking');
            }

            console.log(JSON.stringify({
                status: 'success',
                message: 'Events processed',
                auto_block_enabled: AUTO_BLOCK,
                top_ja4s: topJa4s,
                blocking_result: blockingResult,
                ...(blockingResult && {
                    blocking_rule: {
                        expression: `(cf.bot_management.ja4 in {${topJa4s.map(item => `"${item.ja4}"`).join(" ")}})`,
                        total_requests: topJa4s.reduce((sum, item) => sum + item.count, 0)
                    }
                })
            }), );

        } catch (error) {
            console.error('Error:', error);
            console.log(JSON.stringify({
                status: 'error',
                message: error.message
            }));
        }
    },
};
