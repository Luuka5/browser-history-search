import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import weaviate from 'weaviate-ts-client';
import { initializeSchema } from './schema.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Log OpenAI API key (first few characters only for security)
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 8)}...` : 'Not set');

// Initialize Weaviate client
const client = weaviate.client({
    scheme: 'https',
    host: 'phokm7bqamcs7jboyevgw.c0.europe-west3.gcp.weaviate.cloud',
    apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
    headers: {
        'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY
    }
});

// Initialize schema
initializeSchema().catch(error => {
    console.error('Failed to initialize schema:', error);
    process.exit(1);
});

// Helper function to split text into chunks
function splitIntoChunks(text, chunkSize = 1000) {
    const chunks = [];
    let currentChunk = '';
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            // If a single sentence is longer than chunkSize, split it
            if (sentence.length > chunkSize) {
                const words = sentence.split(' ');
                let currentWordChunk = '';
                for (const word of words) {
                    if ((currentWordChunk + word).length > chunkSize) {
                        chunks.push(currentWordChunk.trim());
                        currentWordChunk = '';
                    }
                    currentWordChunk += word + ' ';
                }
                if (currentWordChunk) {
                    chunks.push(currentWordChunk.trim());
                }
            } else {
                currentChunk = sentence + '. ';
            }
        } else {
            currentChunk += sentence + '. ';
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

// Store a message
app.post('/api/messages', async (req, res) => {
    try {
        console.log('Storing message:', req.body);
        const { content, url } = req.body;
        const timestamp = new Date().toISOString();

        // Split content into chunks
        const chunks = splitIntoChunks(content);
        const totalChunks = chunks.length;

        // Store each chunk
        const results = await Promise.all(chunks.map(async (chunk, index) => {
            return await client.data
                .creator()
                .withClassName('Message')
                .withProperties({
                    content: chunk,
                    timestamp,
                    url: url || 'unknown',  // Use provided URL or 'unknown' if not provided
                    chunkIndex: index,
                    totalChunks
                })
                .do();
        }));

        console.log('Message stored successfully:', results);
        res.json(results);
    } catch (error) {
        console.error('Error storing message:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.status(500).json({ error: error.message });
    }
});

// Store page content
app.post('/api/pages', async (req, res) => {
    try {
        console.log('Storing page:', req.body);
        const { url, title, content } = req.body;
        const timestamp = new Date().toISOString();

        // Split content into chunks
        const chunks = splitIntoChunks(content);
        const totalChunks = chunks.length;

        // Store each chunk
        const results = await Promise.all(chunks.map(async (chunk, index) => {
            return await client.data
                .creator()
                .withClassName('Page')
                .withProperties({
                    url,
                    title,
                    content: chunk,
                    timestamp,
                    chunkIndex: index,
                    totalChunks
                })
                .do();
        }));

        console.log('Page stored successfully:', results);
        res.json(results);
    } catch (error) {
        console.error('Error storing page:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.status(500).json({ error: error.message });
    }
});

// Search similar messages
app.get('/api/messages/similar', async (req, res) => {
    try {
        console.log('Searching similar messages:', req.query);
        const { query } = req.query;
        const result = await client.graphql
            .get()
            .withClassName('Message')
            .withFields('content url timestamp chunkIndex totalChunks _additional { certainty }')
            .withNearText({ concepts: [query] })
            .withLimit(5)
            .do();
        console.log('Similar messages found:', result);
        res.json(result.data.Get.Message);
    } catch (error) {
        console.error('Error searching similar messages:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.status(500).json({ error: error.message });
    }
});

// Search similar pages
app.get('/api/pages/similar', async (req, res) => {
    try {
        console.log('Searching similar pages:', req.query);
        const { query } = req.query;
        const result = await client.graphql
            .get()
            .withClassName('Page')
            .withFields('url title content timestamp chunkIndex totalChunks _additional { certainty }')
            .withNearText({ concepts: [query] })
            .withLimit(5)
            .do();
        console.log('Similar pages found:', result);
        res.json(result.data.Get.Page);
    } catch (error) {
        console.error('Error searching similar pages:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.status(500).json({ error: error.message });
    }
});

// Generate RAG response
app.post('/api/rag', async (req, res) => {
    try {
        console.log('Generating RAG response:', req.body);
        const { query } = req.body;

        // Get similar messages and pages
        const [similarMessages, similarPages] = await Promise.all([
            client.graphql
                .get()
                .withClassName('Message')
                .withFields('content url timestamp chunkIndex totalChunks _additional { certainty }')
                .withNearText({ concepts: [query] })
                .withLimit(3)
                .do(),
            client.graphql
                .get()
                .withClassName('Page')
                .withFields('url title content timestamp chunkIndex totalChunks _additional { certainty }')
                .withNearText({ concepts: [query] })
                .withLimit(3)
                .do()
        ]);

        // Combine context from similar messages and pages
        const context = [
            ...similarMessages.data.Get.Message.map(msg => `[Message from ${new Date(msg.timestamp).toLocaleString()} at ${msg.url || 'unknown'}]: ${msg.content}`),
            ...similarPages.data.Get.Page.map(page => `[Page from ${new Date(page.timestamp).toLocaleString()} at ${page.url || 'unknown'}]: ${page.title}\n${page.content}`)
        ].join('\n');

        // Generate response using ChatGPT
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a personal history assistant that helps users find information from their browsing history. Keep responses concise and focused.

                        Response rules:
                        1. Maximum 2-3 sentences per point
                        2. Use bullet points for multiple items
                        3. Include [links](URL) to sources
                        4. Group related information
                        5. Skip unnecessary details
                        6. Use simple language
                        7. Focus on most relevant information first`
                    },
                    {
                        role: 'user',
                        content: `Based on my browsing history, please answer this question: "${query}"\n\nContext from my history:\n${context}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 300  // Reduced from 500 to encourage brevity
            })
        });

        if (!openaiResponse.ok) {
            throw new Error('Failed to get response from OpenAI');
        }

        const openaiData = await openaiResponse.json();
        const response = openaiData.choices[0].message.content;

        console.log('RAG response generated:', response);
        res.json({ response });
    } catch (error) {
        console.error('Error generating RAG response:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 