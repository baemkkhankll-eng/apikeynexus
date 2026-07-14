require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const session = require('express-session');
const MemoryStore = require('express-session').MemoryStore;
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: new MemoryStore({ checkPeriod: 86400000 }), // Clear expired sessions daily
  cookie: { 
    secure: false, // Set to false for render.com compatibility
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Discord Strategy
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && process.env.DISCORD_CALLBACK_URL) {
  passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'email']
  },
  (accessToken, refreshToken, profile, done) => {
    // Find or create user
    let user = users.find(u => u.discordId === profile.id);
    if (!user) {
      user = {
        id: Date.now().toString(),
        discordId: profile.id,
        username: profile.username,
        email: profile.email,
        developerId: generateDeveloperId(),
        createdAt: new Date().toISOString()
      };
      users.push(user);
    }
    return done(null, user);
  }));
} else {
  console.warn('Discord OAuth credentials not configured. Discord login will not work.');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// In-memory storage (replace with database in production)
let keys = [];
let users = [];

// Generate secure random key
function generateSecureKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  for (let i = 0; i < 4; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      segment += chars[randomIndex];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

// Calculate expiration time
function calculateExpirationTime(value, unit) {
  const now = new Date();
  const multipliers = {
    'minutes': 60 * 1000,
    'hours': 60 * 60 * 1000,
    'days': 24 * 60 * 60 * 1000
  };
  return new Date(now.getTime() + (value * multipliers[unit]));
}

// API: Get all keys with statistics
app.get('/api/keys', requireAuth, (req, res) => {
  const userKeys = keys.filter(k => k.userId === req.user.id);
  const stats = {
    total: userKeys.length,
    active: userKeys.filter(k => k.status === 'active' && new Date(k.expiresAt) > new Date()).length,
    banned: userKeys.filter(k => k.status === 'banned').length,
    expired: userKeys.filter(k => new Date(k.expiresAt) <= new Date()).length
  };
  res.json({ keys: userKeys, stats });
});

// Generate developer ID
function generateDeveloperId() {
  return 'DEV-' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// API: Get current user
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.json(null);
  }
});

// API: Generate new key (with custom or random)
app.post('/api/keys/generate', requireAuth, (req, res) => {
  const { duration, durationUnit, customKey } = req.body;
  
  const newKey = {
    id: Date.now().toString(),
    key: customKey || generateSecureKey(),
    createdAt: new Date().toISOString(),
    expiresAt: calculateExpirationTime(duration, durationUnit).toISOString(),
    hwid: null,
    status: 'active',
    banReason: null,
    userId: req.user.id,
    developerId: req.user.developerId
  };
  
  keys.push(newKey);
  res.json(newKey);
});

// API: Ban key
app.post('/api/keys/:id/ban', requireAuth, (req, res) => {
  const { reason } = req.body;
  const key = keys.find(k => k.id === req.params.id && k.userId === req.user.id);
  
  if (key) {
    key.status = 'banned';
    key.banReason = reason;
    res.json(key);
  } else {
    res.status(404).json({ error: 'Key not found' });
  }
});

// API: Unban key
app.post('/api/keys/:id/unban', requireAuth, (req, res) => {
  const key = keys.find(k => k.id === req.params.id && k.userId === req.user.id);
  
  if (key) {
    key.status = 'active';
    key.banReason = null;
    res.json(key);
  } else {
    res.status(404).json({ error: 'Key not found' });
  }
});

// API: Reset HWID
app.post('/api/keys/:id/reset-hwid', requireAuth, (req, res) => {
  const key = keys.find(k => k.id === req.params.id && k.userId === req.user.id);
  
  if (key) {
    key.hwid = null;
    res.json(key);
  } else {
    res.status(404).json({ error: 'Key not found' });
  }
});

// API: Delete key
app.delete('/api/keys/:id', requireAuth, (req, res) => {
  const index = keys.findIndex(k => k.id === req.params.id && k.userId === req.user.id);
  
  if (index !== -1) {
    keys.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Key not found' });
  }
});

// API: Validate key (for client applications)
app.post('/api/validate', (req, res) => {
  const { key, hwid, developerId } = req.body;
  const keyData = keys.find(k => k.key === key);
  
  if (!keyData) {
    return res.json({ valid: false, message: 'Invalid key' });
  }
  
  // Verify developer ID matches
  if (keyData.developerId !== developerId) {
    return res.json({ valid: false, message: 'Developer ID mismatch' });
  }
  
  if (keyData.status === 'banned') {
    return res.json({ valid: false, message: 'Key is banned' });
  }
  
  if (new Date(keyData.expiresAt) < new Date()) {
    return res.json({ valid: false, message: 'Key expired' });
  }
  
  if (keyData.hwid === null) {
    keyData.hwid = hwid;
    return res.json({ valid: true, message: 'Key activated' });
  }
  
  if (keyData.hwid !== hwid) {
    return res.json({ valid: false, message: 'HWID mismatch' });
  }
  
  return res.json({ valid: true, message: 'Key valid' });
});

// Discord Auth Routes
app.get('/auth/discord', (req, res, next) => {
  console.log('Discord auth initiated');
  next();
}, passport.authenticate('discord'));

app.get('/auth/discord/callback', (req, res, next) => {
  console.log('Discord callback received, session:', req.session);
  console.log('Session ID:', req.sessionID);
  next();
}, 
  passport.authenticate('discord', { 
    failureRedirect: '/',
    failureMessage: true 
  }),
  (req, res) => {
    console.log('Discord auth successful, user:', req.user);
    console.log('Session after auth:', req.session);
    console.log('Is authenticated:', req.isAuthenticated());
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Health check endpoint for render and other platforms
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
