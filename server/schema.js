import weaviate from 'weaviate-ts-client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from the server directory
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Log environment variables
console.log('Environment variables:', {
    hasWeaviateKey: !!process.env.WEAVIATE_API_KEY,
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    port: process.env.PORT,
    cwd: process.cwd()
});

// Log OpenAI API key (first few characters only for security)
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 8)}...` : 'Not set');

// Use cloud Weaviate instance with API key
const client = weaviate.client({
    scheme: 'https',
    host: 'phokm7bqamcs7jboyevgw.c0.europe-west3.gcp.weaviate.cloud',
    apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
    headers: {
        'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY
    }
});

async function initializeSchema() {
    try {
        console.log('Attempting to get schema...');
        // Check if classes exist
        const schema = await client.schema.getter().do();
        console.log('Current schema:', schema);
        const existingClasses = schema.classes.map(c => c.class);
        console.log('Existing classes:', existingClasses);

        // Create Page class if it doesn't exist
        if (!existingClasses.includes('Page')) {
            console.log('Creating Page class...');
            await client.schema
                .classCreator()
                .withClass({
                    class: 'Page',
                    vectorizer: 'text2vec-openai',
                    properties: [
                        {
                            name: 'url',
                            dataType: ['string'],
                        },
                        {
                            name: 'title',
                            dataType: ['string'],
                        },
                        {
                            name: 'content',
                            dataType: ['string'],
                        },
                        {
                            name: 'timestamp',
                            dataType: ['string'],
                        },
                        {
                            name: 'chunkIndex',
                            dataType: ['int'],
                        },
                        {
                            name: 'totalChunks',
                            dataType: ['int'],
                        }
                    ]
                })
                .do();
            console.log('Created Page class');
        }

        // Create Message class if it doesn't exist
        if (!existingClasses.includes('Message')) {
            console.log('Creating Message class...');
            await client.schema
                .classCreator()
                .withClass({
                    class: 'Message',
                    vectorizer: 'text2vec-openai',
                    properties: [
                        {
                            name: 'content',
                            dataType: ['string'],
                        },
                        {
                            name: 'timestamp',
                            dataType: ['string'],
                        },
                        {
                            name: 'url',
                            dataType: ['string'],
                        },
                        {
                            name: 'chunkIndex',
                            dataType: ['int'],
                        },
                        {
                            name: 'totalChunks',
                            dataType: ['int'],
                        }
                    ]
                })
                .do();
            console.log('Created Message class');
        }

        console.log('Schema initialization complete');
    } catch (error) {
        console.error('Error initializing schema:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        throw error;
    }
}

// Add main execution block
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeSchema()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Failed to initialize schema:', error);
            process.exit(1);
        });
}

export { initializeSchema }; 