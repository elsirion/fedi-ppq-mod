# PPQ.ai Simple Chat Frontend

A simple, user-friendly frontend for [PPQ.ai](https://ppq.ai) that automatically manages your account balance and triggers WebLN payments when credits run low.

## Features

- **Automatic Account Creation**: Creates a PPQ.ai account on first use
- **Chat Interface**: Clean, modern chat UI for interacting with AI models
- **Automatic Balance Monitoring**: Checks your balance before and after each message
- **Automatic WebLN Top-ups**: Automatically triggers $1 Lightning payments when balance falls below $0.10
- **Model Selection**: Attempts to use gpt-5.1-chat, falls back to available models
- **Persistent Storage**: Saves your API credentials in browser localStorage

## Prerequisites

- A modern web browser
- WebLN support (e.g., Fedi Wallet mini-app or WebLN browser extension)

## Installation

1. Clone or download this repository
2. Open `index.html` in your web browser

That's it! No build process or server required.

## Usage

### First Time Setup

1. Open `index.html` in your browser
2. The app will automatically create a new PPQ.ai account for you
3. Your API credentials are automatically saved in your browser's localStorage

### Chatting

1. Type your message in the text area
2. Press Enter or click "Send"
3. The AI will respond using the configured model
4. Your balance will be automatically checked after each message

### Automatic Top-ups

When your balance falls below $0.10:
1. The app automatically initiates a $1 Lightning payment via WebLN
2. Approve the payment in your wallet
3. The app waits for confirmation and updates your balance
4. If top-up fails, a retry button appears

You can also manually check your balance by clicking the "Refresh" button in the header.

## Configuration

You can modify these constants in `app.js`:

```javascript
const CHAT_MODEL = 'gpt-5.1-chat'; // Model to use
const LOW_BALANCE_THRESHOLD = 0.1; // Trigger top-up below this amount
const TOPUP_AMOUNT = 1.0; // Top-up amount in USD
```

## How It Works

### Account Creation
- Uses the PPQ.ai `/accounts/create` endpoint
- Stores `api_key` and `credit_id` in browser localStorage

### Balance Checking
- Uses the `/credits/balance` endpoint
- Checks balance after receiving responses
- Automatically triggers top-up when below threshold

### Chat
- Uses the OpenAI-compatible `/chat/completions` endpoint
- Maintains conversation history for context
- Handles errors gracefully, triggers automatic top-up on balance errors

### Automatic Top-ups
- Automatically creates Lightning invoice via `/topup/create/lightning`
- Uses WebLN API to send payment through your browser wallet
- Polls `/topup/status/{invoice_id}` for confirmation
- Shows retry button if payment fails
- Automatically refreshes balance after successful payment

## API Endpoints Used

- `POST /accounts/create` - Account creation
- `GET /v1/models` - List available models
- `POST /credits/balance` - Check account balance
- `POST /chat/completions` - Send chat messages
- `POST /topup/create/lightning` - Create Lightning invoice
- `GET /topup/status/{invoice_id}` - Check payment status

## Troubleshooting

### "Add mini-app to Fedi Wallet" error
Use Fedi Wallet or install a WebLN-compatible browser extension

### Balance not updating
Click the "Refresh" button or reload the page

### Model not found
The app will automatically fall back to the first available model if gpt-5.1-chat is not available

### Lost API credentials
Delete your browser's localStorage for this site and create a new account

## Security Notes

- API credentials are stored in browser localStorage
- Clear your browser data to remove stored credentials
- Each browser/device will have its own account
- Keep your API key secure - don't share screenshots containing it

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and layout
- `app.js` - Application logic and API integration

## License

This project is provided as-is for use with PPQ.ai services.
