// Store a message in Weaviate
async function storeMessage(content) {
    try {
        const response = await fetch('http://localhost:3000/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content,
                url: window.location.href
            }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error storing message:', error);
        throw error;
    }
}

// Store page content in Weaviate
async function storePage(url, title, content) {
    try {
        const response = await fetch('http://localhost:3000/api/pages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, title, content }),
        });
        return await response.json();
    } catch (error) {
        console.error('Error storing page:', error);
        throw error;
    }
}

// Search for similar messages
async function searchSimilarMessages(query) {
    try {
        const response = await fetch(`http://localhost:3000/api/messages/similar?query=${encodeURIComponent(query)}`);
        return await response.json();
    } catch (error) {
        console.error('Error searching similar messages:', error);
        throw error;
    }
}

// Search for similar pages
async function searchSimilarPages(query) {
    try {
        const response = await fetch(`http://localhost:3000/api/pages/similar?query=${encodeURIComponent(query)}`);
        return await response.json();
    } catch (error) {
        console.error('Error searching similar pages:', error);
        throw error;
    }
}

// Function to extract page content
function extractPageContent() {
    const title = document.title;

    // Create a clone of the body to work with
    const bodyClone = document.body.cloneNode(true);

    // Remove the chat container if it exists
    const chatContainer = bodyClone.querySelector('#github-rag-chat-container');
    if (chatContainer) {
        chatContainer.remove();
    }

    // Get the text content from the modified clone
    const content = bodyClone.innerText;

    return { title, content };
}

// Store current page when it loads
async function storeCurrentPage() {
    const { title, content } = extractPageContent();
    const url = window.location.href;

    try {
        const response = await fetch('http://localhost:3000/api/pages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url, title, content }),
        });
        if (!response.ok) {
            throw new Error('Failed to store page');
        }
    } catch (error) {
        console.error('Error storing page:', error);
    }
}

// Create chat interface
function createChatInterface() {
    // Remove any existing chat container
    const existingChat = document.getElementById('github-rag-chat');
    if (existingChat) {
        existingChat.remove();
    }

    const chatContainer = document.createElement('div');
    chatContainer.id = 'github-rag-chat';
    chatContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;

    // Chat header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 12px;
        background: #24292e;
        color: white;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
    `;
    header.innerHTML = `<span style="font-weight: 600;">GitHub RAG Chat</span>`;

    // Messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.style.cssText = `
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        background: #f6f8fa;
    `;

    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
        padding: 12px;
        border-top: 1px solid #e1e4e8;
        display: flex;
        gap: 8px;
        background: white;
        border-radius: 0 0 8px 8px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type your message...';
    input.style.cssText = `
        flex: 1;
        padding: 8px;
        border: 1px solid #e1e4e8;
        border-radius: 4px;
        font-size: 14px;
    `;

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.cssText = `
        padding: 8px 12px;
        background: #2ea44f;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;

    // Assemble the chat interface
    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    chatContainer.appendChild(header);
    chatContainer.appendChild(messagesContainer);
    chatContainer.appendChild(inputContainer);
    document.body.appendChild(chatContainer);

    // Add event listeners
    sendButton.addEventListener('click', () => sendMessage(input, messagesContainer));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(input, messagesContainer);
        }
    });

    // Make chat draggable
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        if (e.target === header || e.target.parentNode === header) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            setTranslate(currentX, currentY, chatContainer);
        }
    }

    function dragEnd() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}

// Function to convert markdown links to HTML
function convertMarkdownLinks(text) {
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #0366d6; text-decoration: none;">$1</a>');
}

// Send message and get response
async function sendMessage(input, messagesContainer) {
    const message = input.value.trim();
    if (!message) return;

    // Clear input
    input.value = '';

    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.style.cssText = `
        margin-bottom: 8px;
        padding: 8px 12px;
        background: #e1e4e8;
        border-radius: 6px;
        align-self: flex-end;
        max-width: 80%;
    `;
    userMessageDiv.textContent = message;
    messagesContainer.appendChild(userMessageDiv);

    try {
        // Store message
        const storeResponse = await fetch('http://localhost:3000/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: message }),
        });

        if (!storeResponse.ok) {
            throw new Error('Failed to store message');
        }

        // Get RAG response
        const ragResponse = await fetch('http://localhost:3000/api/rag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: message }),
        });

        if (!ragResponse.ok) {
            throw new Error('Failed to get RAG response');
        }

        const { response } = await ragResponse.json();

        // Add AI response to chat
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.style.cssText = `
            margin-bottom: 8px;
            padding: 8px 12px;
            background: #f6f8fa;
            border-radius: 6px;
            align-self: flex-start;
            max-width: 80%;
        `;
        aiMessageDiv.innerHTML = convertMarkdownLinks(response);
        messagesContainer.appendChild(aiMessageDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('Error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            margin-bottom: 8px;
            padding: 8px 12px;
            background: #ffd7d7;
            border-radius: 6px;
            align-self: flex-start;
            max-width: 80%;
            color: #cb2431;
        `;
        errorDiv.textContent = 'Error: Failed to get response. Please try again.';
        messagesContainer.appendChild(errorDiv);
    }
}

// Initialize when page loads
console.log('GitHub RAG Chat: Initializing...');
storeCurrentPage();
createChatInterface();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'reloadChat') {
        createChatInterface();
    }
}); 