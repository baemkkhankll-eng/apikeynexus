# HWID Key Authentication Service

Professional Admin Control Panel for managing HWID-based license keys with secure random generation.

## Features

- **Discord OAuth Authentication** - Secure login with Discord account
- **User System** - Each user has their own isolated key management
- **Developer ID System** - Unique developer ID for API connections
- **Custom Key Generation** - Generate custom keys or use secure random generation
- **Secure Random Key Generation** - Cryptographically secure key generation using Node.js crypto module
- **HWID Locking** - Keys are locked to specific hardware identifiers
- **Key Management** - Ban, unban, reset HWID, and delete keys
- **Statistics Dashboard** - Real-time overview of total, active, banned, and expired keys
- **Professional UI** - Clean, modern interface with white-blue color scheme

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Configure Discord OAuth:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "OAuth2" > "General"
   - Copy "Client ID" and "Client Secret"
   - Add redirect URL: `http://localhost:3000/auth/discord/callback` (for local development)
   - For production (e.g., render.com): `https://your-app.onrender.com/auth/discord/callback`
   - Copy Client ID and Client Secret to `.env`
   - Set `DISCORD_CALLBACK_URL` in `.env` to match the redirect URL exactly

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## API Endpoints

### Get All Keys
```
GET /api/keys
```

### Generate New Key
```
POST /api/keys/generate
Body: { duration: number, durationUnit: 'minutes' | 'hours' | 'days', customKey?: string }
```

### Get Current User
```
GET /api/user
```

### Ban Key
```
POST /api/keys/:id/ban
Body: { reason: string }
```

### Unban Key
```
POST /api/keys/:id/unban
```

### Reset HWID
```
POST /api/keys/:id/reset-hwid
```

### Delete Key
```
DELETE /api/keys/:id
```

### Validate Key (for client applications)
```
POST /api/validate
Body: { key: string, hwid: string, developerId: string }
```

### Discord Auth Routes
```
GET /auth/discord
GET /auth/discord/callback
GET /auth/logout
```

## Key Format

Keys are generated in the format: `KEY-XXXX-XXXX-XXXX-XXXX` where X is a random uppercase letter or digit.

## Design Specifications

- **Color Palette**: White background with blue accents (#1E40AF, #2563EB)
- **Border Radius**: 8px - 12px for professional appearance
- **Typography**: Inter font family
- **Layout**: Grid-based dashboard with scannable table design

## Notes

- This implementation uses in-memory storage. For production use, integrate with a database (MongoDB, PostgreSQL, etc.)
- Keys expire based on the duration set during generation
- HWID locking prevents key sharing across different machines
- Each user has their own isolated key management system
- Developer ID is required for key validation to ensure proper ownership
- Custom keys can be any format you prefer
