// PPQ.ai Chat Application
const API_BASE = 'https://api.ppq.ai';
const CHAT_MODEL = 'gpt-5.1-chat'; // Will fall back to available model if this doesn't exist
const LOW_BALANCE_THRESHOLD = 0.1; // Trigger top-up below $0.10
const TOPUP_AMOUNT = 1.0; // Top up $1 USD

class PPQApp {
    constructor() {
        this.apiKey = null;
        this.creditId = null;
        this.balance = null;
        this.conversationHistory = [];
        this.availableModels = [];
        this.selectedModel = null;
        this.isProcessing = false;
        this.isTopping = false;
        this.conversations = [];
        this.currentConversationId = null;

        this.init();
    }

    async init() {
        // Load saved credentials
        this.loadCredentials();

        // Set up event listeners
        this.setupEventListeners();

        // Check if we have an account
        if (this.apiKey) {
            this.showChatScreen();
            this.loadModels();
            this.checkBalance();
        } else {
            // Automatically create account
            this.showSetupScreen();
            await this.createAccount();
        }
    }

    setupEventListeners() {
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('send-btn-list').addEventListener('click', () => this.sendMessageFromList());
        document.getElementById('retry-btn').addEventListener('click', () => this.createAccount());
        document.getElementById('retry-topup-btn').addEventListener('click', () => this.initiateTopup());
        document.getElementById('back-btn').addEventListener('click', () => this.showConversationsView());
        document.getElementById('delete-btn').addEventListener('click', () => this.deleteCurrentConversation());

        const input = document.getElementById('message-input');
        const inputList = document.getElementById('message-input-list');

        // Allow Enter to send
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });

        inputList.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessageFromList();
            }
        });
    }

    loadCredentials() {
        this.apiKey = localStorage.getItem('ppq_api_key');
        this.creditId = localStorage.getItem('ppq_credit_id');
        this.loadConversations();
    }

    saveCredentials() {
        localStorage.setItem('ppq_api_key', this.apiKey);
        localStorage.setItem('ppq_credit_id', this.creditId);
    }

    loadConversations() {
        const stored = localStorage.getItem('ppq_conversations');
        this.conversations = stored ? JSON.parse(stored) : [];

        // Show conversations list view
        this.showConversationsView();
        this.renderConversationsList();
    }

    saveConversations() {
        localStorage.setItem('ppq_conversations', JSON.stringify(this.conversations));
    }

    showConversationsView() {
        document.getElementById('conversations-view').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('hidden');
        document.getElementById('setup-screen').classList.add('hidden');
        this.currentConversationId = null;
        this.renderConversationsList();
    }

    showChatView() {
        document.getElementById('conversations-view').classList.add('hidden');
        document.getElementById('chat-screen').classList.remove('hidden');
        document.getElementById('setup-screen').classList.add('hidden');
    }

    createNewConversation() {
        const newConv = {
            id: Date.now().toString(),
            title: 'New conversation',
            messages: [],
            createdAt: Date.now()
        };

        this.conversations.unshift(newConv);
        this.currentConversationId = newConv.id;
        this.conversationHistory = [];

        // Clear messages UI
        document.getElementById('messages').innerHTML = '';

        // Update conversation title and balance
        document.getElementById('conversation-title').textContent = newConv.title;
        document.getElementById('chat-balance').textContent = this.balance ? `$${this.balance.toFixed(2)}` : '$0.00';

        this.saveConversations();
        this.showChatView();
    }

    deleteCurrentConversation() {
        if (!this.currentConversationId) return;

        const shouldDelete = confirm('Are you sure you want to delete this conversation?');
        if (!shouldDelete) return;

        this.conversations = this.conversations.filter(c => c.id !== this.currentConversationId);
        this.saveConversations();
        this.showConversationsView();
    }

    sendMessageFromList() {
        const input = document.getElementById('message-input-list');
        const message = input.value.trim();

        if (!message || this.isProcessing) return;

        // Create new conversation and switch to chat view
        this.createNewConversation();

        // Copy message to chat input and send
        document.getElementById('message-input').value = message;
        input.value = '';

        this.sendMessage();
    }

    loadConversation(id) {
        const conv = this.conversations.find(c => c.id === id);
        if (!conv) return;

        this.currentConversationId = id;
        this.conversationHistory = conv.messages;

        // Update conversation title and balance
        document.getElementById('conversation-title').textContent = conv.title;
        document.getElementById('chat-balance').textContent = this.balance ? `$${this.balance.toFixed(2)}` : '$0.00';

        // Clear and render messages
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';

        conv.messages.forEach(msg => {
            this.addMessage(msg.role, msg.content, false);
        });

        this.showChatView();
    }

    saveCurrentConversation() {
        const conv = this.conversations.find(c => c.id === this.currentConversationId);
        if (!conv) return;

        conv.messages = this.conversationHistory;

        // Update title based on first user message
        if (this.conversationHistory.length > 0 && conv.title === 'New conversation') {
            const firstUserMsg = this.conversationHistory.find(m => m.role === 'user');
            if (firstUserMsg) {
                conv.title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                document.getElementById('conversation-title').textContent = conv.title;
            }
        }

        this.saveConversations();
    }

    renderConversationsList() {
        const list = document.getElementById('conversations-list');
        list.innerHTML = '';

        if (this.conversations.length === 0) {
            return;
        }

        this.conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.innerHTML = `
                <div class="conversation-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </div>
                <div class="conversation-title text text--body">${conv.title}</div>
            `;
            item.addEventListener('click', () => this.loadConversation(conv.id));
            list.appendChild(item);
        });
    }

    showSetupScreen() {
        document.getElementById('setup-screen').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('hidden');
        document.getElementById('conversations-view').classList.add('hidden');
    }

    showChatScreen() {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('conversations-view').classList.remove('hidden');
        document.getElementById('chat-screen').classList.add('hidden');
    }

    showTopupBanner(message, isError = false) {
        const banner = document.getElementById('topup-banner');
        const status = document.getElementById('topup-status');
        const retryBtn = document.getElementById('retry-topup-btn');

        status.textContent = message;
        status.className = isError ? 'status error' : 'status info';
        retryBtn.classList.toggle('hidden', !isError);
        banner.classList.remove('hidden');
    }

    hideTopupBanner() {
        document.getElementById('topup-banner').classList.add('hidden');
    }

    async createAccount() {
        const status = document.getElementById('setup-status');
        const retryBtn = document.getElementById('retry-btn');

        status.textContent = 'Creating account...';
        status.className = 'status info';
        retryBtn.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE}/accounts/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.api_key && data.credit_id) {
                this.apiKey = data.api_key;
                this.creditId = data.credit_id;
                this.saveCredentials();

                status.textContent = 'Ready!';
                status.className = 'status success';

                setTimeout(() => {
                    this.showChatScreen();
                    this.loadModels();
                    this.checkBalance();
                }, 500);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Account creation error:', error);
            status.textContent = `Failed: ${error.message}`;
            status.className = 'status error';
            retryBtn.classList.remove('hidden');
        }
    }

    async loadModels() {
        try {
            const response = await fetch(`${API_BASE}/v1/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.availableModels = data.data || [];

                // Try to find gpt-5.1-chat, otherwise use the first available model
                const targetModel = this.availableModels.find(m => m.id === CHAT_MODEL);
                if (targetModel) {
                    this.selectedModel = CHAT_MODEL;
                } else if (this.availableModels.length > 0) {
                    this.selectedModel = this.availableModels[0].id;
                    console.warn(`Model ${CHAT_MODEL} not found, using ${this.selectedModel} instead`);
                } else {
                    // Fallback to trying gpt-5.1-chat anyway
                    this.selectedModel = CHAT_MODEL;
                }
            } else {
                // If we can't load models, just try with the requested model
                this.selectedModel = CHAT_MODEL;
            }
        } catch (error) {
            console.error('Error loading models:', error);
            this.selectedModel = CHAT_MODEL;
        }
    }

    async checkBalance() {
        const balanceDisplay = document.getElementById('balance-display');
        const chatBalance = document.getElementById('chat-balance');
        balanceDisplay.textContent = '$...';

        try {
            const response = await fetch(`${API_BASE}/credits/balance`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.balance = parseFloat(data.balance) || 0;

            balanceDisplay.textContent = `$${this.balance.toFixed(2)}`;
            if (chatBalance) {
                chatBalance.textContent = `$${this.balance.toFixed(2)}`;
            }

            // Auto top-up if balance is low
            if (this.balance < LOW_BALANCE_THRESHOLD && !this.isTopping) {
                this.initiateTopup();
            }
        } catch (error) {
            console.error('Balance check error:', error);
            balanceDisplay.textContent = 'Error';
        }
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();

        if (!message || this.isProcessing) return;

        // Create new conversation if starting from conversations view
        if (!this.currentConversationId) {
            this.createNewConversation();
        }

        this.isProcessing = true;
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('send-btn').disabled = true;

        // Add user message to UI
        this.addMessage('user', message);

        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message
        });

        try {
            const response = await fetch(`${API_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.selectedModel,
                    messages: this.conversationHistory,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Check if it's a balance error
                if (response.status === 402 || response.status === 429 ||
                    (errorData.error && errorData.error.includes('balance'))) {
                    this.addMessage('error', 'Insufficient balance. Topping up...');
                    await this.initiateTopup();
                    return;
                }

                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const assistantMessage = data.choices[0].message.content;

            // Add assistant message to UI
            this.addMessage('assistant', assistantMessage);

            // Add to conversation history
            this.conversationHistory.push({
                role: 'assistant',
                content: assistantMessage
            });

            // Check balance after message
            this.checkBalance();

        } catch (error) {
            console.error('Send message error:', error);
            this.addMessage('error', `Error: ${error.message}`);
        } finally {
            this.isProcessing = false;
            document.getElementById('send-btn').disabled = false;
            input.focus();
        }
    }

    addMessage(type, content, shouldSave = true) {
        const messagesContainer = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (shouldSave) {
            this.saveCurrentConversation();
        }
    }

    async initiateTopup() {
        if (this.isTopping) return;

        this.isTopping = true;
        this.showTopupBanner('Creating Lightning invoice...');

        try {
            // Create Lightning invoice
            const response = await fetch(`${API_BASE}/topup/create/btc-lightning`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: TOPUP_AMOUNT,
                    currency: 'USD'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const invoice = data.lightning_invoice || data.invoice || data.payment_request;
            const invoiceId = data.invoice_id;

            if (!invoice) {
                throw new Error('No invoice received');
            }

            // Check if WebLN is available
            if (!window.webln) {
                console.log('Lightning Invoice:', invoice);
                console.log('Invoice ID:', invoiceId);
                throw new Error('Add mini-app to Fedi Wallet');
            }

            this.showTopupBanner('Approve payment in wallet...');

            // Enable WebLN
            await window.webln.enable();

            // Send payment
            await window.webln.sendPayment(invoice);

            this.showTopupBanner('Confirming payment...');

            // Poll for payment confirmation
            await this.waitForTopupConfirmation(invoiceId);

            this.showTopupBanner('Top-up successful!');

            // Refresh balance
            await this.checkBalance();

            setTimeout(() => {
                this.hideTopupBanner();
                this.isTopping = false;
            }, 2000);

        } catch (error) {
            console.error('Top-up error:', error);
            this.showTopupBanner(`Top-up failed: ${error.message}`, true);
            this.isTopping = false;
        }
    }

    async waitForTopupConfirmation(invoiceId, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                const response = await fetch(`${API_BASE}/topup/status/${invoiceId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'completed' || data.status === 'confirmed' || data.paid) {
                        return true;
                    }
                }
            } catch (error) {
                console.error('Error checking topup status:', error);
            }
        }

        throw new Error('Payment confirmation timeout');
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PPQApp());
} else {
    new PPQApp();
}
