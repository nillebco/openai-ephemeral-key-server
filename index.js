require('dotenv').config();
const apiKey = process.env.OPENAI_API_KEY;
const express = require('express');
const app = express();

async function getEphemeralKey(apiKey, voice = "coral", model = "gpt-4o-realtime-preview-2024-12-17") {
    try {
        const response = await fetch(
            "https://api.openai.com/v1/realtime/sessions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    voice,
                }),
            },
        );

        const data = await response.json();
        if (data.client_secret) {
            return data.client_secret.value;
        } else {
            console.error("Token generation error:", data);
            return null;
        }
    } catch (error) {
        console.error("Token generation error:", error);
        return null;
    }
}

function isAllowedCallerId(callerId) {
    return process.env.ALLOWED_CALLER_ID.split(",").includes(callerId);
}

function isAuthorized(req) {
    const queryKey = req.query.key;
    if (queryKey) {
        return isAllowedCallerId(queryKey);
    }

    const authorization = req.headers.authorization;
    if (!authorization) {
        return false;
    }
    const authorizationParts = authorization.split(" ");
    if (authorizationParts.length !== 2) {
        return false;
    }
    const callerId = authorizationParts[1];
    if (isAllowedCallerId(callerId)) {
        return true;
    }
}

app.use(express.json());

app.post('/realtime/ephemeral-key', async (req, res) => {
    try {
        const { voice, model } = req.body;

        if (!isAuthorized(req)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const key = await getEphemeralKey(apiKey, voice, model);

        if (!key) {
            return res.status(500).json({ error: 'Failed to generate ephemeral key' });
        }

        res.json({ key });
    } catch (error) {
        console.error('Endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
