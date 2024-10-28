(function() {
    'use strict';

    // tokeyns
    const SLACK_TOKEN = 'xxxxxx';  // Slack OAuth token
    const JIRA_PAT = 'xxxxxxx';        // Jira Personal Access Token

    
    function addPostButton() {
        if (document.getElementById('post-to-slack-btn')) return; 

        const button = document.createElement('button');
        button.id = 'post-to-slack-btn';
        button.textContent = 'Post to Slack';
        button.style.position = 'fixed';
        button.style.top = '20px';
        button.style.right = '20px';
        button.style.zIndex = '1000';
        button.style.padding = '10px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.cursor = 'pointer';

        document.body.appendChild(button);

        button.addEventListener('click', async () => {
            const ticketID = getTicketIDFromURL();
            if (!ticketID) {
                alert("Could not determine the ticket ID from the URL.");
                return;
            }

            const channel = prompt("Enter the Slack channel (e.g., #doms):");
            if (!channel) {
                alert("Please provide a Slack channel.");
                return;
            }

            const ticket = await getJiraTicket(ticketID);
            if (ticket) {
                const title = ticket.fields.summary || "No title";
                const description = ticket.fields.description || "No description provided.";
                const priority = ticket.fields.priority.name || "Medium"; // Default prio

                await postToSlack(channel, priority, ticketID, title, description);
            }
        });
    }

    // Extract the ticket ID from the URL
    function getTicketIDFromURL() {
        const urlParts = window.location.pathname.split('/');
        return urlParts[urlParts.length - 1];
    }

    // Fetch Jira ticket details using ur PAT
    async function getJiraTicket(ticketID) {
        const jiraUrl = `https://your-jira-itsm-domain.com/rest/api/2/issue/${ticketID}`;
        const headers = new Headers({
            'Authorization': `Bearer ${JIRA_PAT}`,
            'Accept': 'application/json'
        });

        try {
            const response = await fetch(jiraUrl, { headers: headers });
            if (response.ok) {
                return response.json();
            } else {
                const errorText = await response.text();
                console.error("Jira Error Response:", errorText);
                alert("Error fetching Jira ticket. Please check your permissions and PAT.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching Jira ticket:", error);
        }
    }

    // Map Jira prio to Slack labels
    function getPriorityLabel(priority) {
        const priorityMap = {
            'Critical': 'P1',
            'High': 'P2',
            'Medium': 'P3',
            'Low': 'P4'
        };
        return priorityMap[priority] || 'P3'; // Default to P3 but depends on your itsm setup
    }

    // Post to Slack
    async function postToSlack(channel, priority, ticketID, title, description) {
        const slackUrl = "https://slack.com/api/chat.postMessage";
        const jiraTicketUrl = `https://your-jira-itsm.com/browse/${ticketID}`;
        const priorityLabel = getPriorityLabel(priority);

        const message = `${priorityLabel} <${jiraTicketUrl}|${ticketID}> | ${title}`;

        const payload = {
            channel: channel,
            text: message
        };

        const headers = new Headers({
            'Authorization': `Bearer ${SLACK_TOKEN}`,
            'Content-Type': 'application/json'
        });

        // Post prio, ticketid, title
        try {
            const response = await fetch(slackUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const responseData = await response.json();
                const thread_ts = responseData.ts; 

                // Post ticket description on thread
                const threadPayload = {
                    channel: channel,
                    text: description,
                    thread_ts: thread_ts
                };
                await fetch(slackUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(threadPayload)
                });

                // Ping group or user
                const pingPayload = {
                    channel: channel,
                //  text: "<@slackuser> Heads up!",  // replace 'slackuser' with the actual Slack Member ID
                    text: "<!subteam^slackgroup> Heads up!",  //  replace 'slackgroup' with the actual Slack group ID
                    thread_ts: thread_ts
                };
                await fetch(slackUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(pingPayload)
                });
            } else {
                alert("Error posting to Slack.");
            }
        } catch (error) {
            console.error("Error posting to Slack:", error);
        }
    }

    // Add button when the script is loaded
    addPostButton();
})();

