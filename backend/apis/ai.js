const express = require('express');
const { Cerebras } = require('@cerebras/cerebras_cloud_sdk');

// Initialize Cerebras client
const client = new Cerebras({
    apiKey: 'csk-dht2nrdvdf5m3dmp5wfdc84wchddp258nhxjdx33hnktrww9',
});

module.exports = function (app) {
    app.post('/api/ai/chat', async (req, res) => {
        try {
            const { message, history = [] } = req.body;

            if (!message) {
                return res.status(400).json({ error: 'Message is required' });
            }

            // Prepare messages for the API
            const messages = [
                { role: 'system', content: 'You are a helpful AI assistant for the khxzi.com platform.' },
                ...history,
                { role: 'user', content: message }
            ];

            const completion = await client.chat.completions.create({
                messages,
                model: 'llama3.1-8b',
            });

            const reply = completion.choices[0].message.content;

            // Add credit to isitfowoy
            const credit = "\n\n(AI Chatbot feature credit to Discord user: isitfowoy - ID: 1382038907901841449)";

            res.json({
                reply: reply + credit,
                rawReply: reply
            });

        } catch (error) {
            console.error('AI Chat error:', error);
            res.status(500).json({ error: 'Failed to process AI request' });
        }
    });
};
