# Supabase Setup Guide

## ✅ Supabase is Now Integrated!

### 📋 What's Included:

1. **User Authentication** - Sign up, sign in, sign out
2. **Token Sync** - Token balance synced across devices
3. **Transcription Backup** - Optional cloud backup
4. **Usage Analytics** - Track usage patterns
5. **Comprehensive Audit Logging** - Track all user activity for dispute resolution
   - Login/logout events with IP address
   - POPIA acceptance tracking
   - Transcription start/complete/failure
   - Download success/failure tracking
   - Automatic cleanup after 60 days

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Run Database Setup

1. Go to [Supabase Dashboard](https://kzjjkorirrrcqlhcdyqg.supabase.co)
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the SQL from `supabase-client.js` (lines with `SETUP_SQL`)
5. Click **Run** ✅

**Or use this SQL:**

```sql
-- User tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_tokens INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  tokens_remaining INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transcriptions table (optional backup)
CREATE TABLE IF NOT EXISTS transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  transcription_text TEXT NOT NULL,
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_tokens
CREATE POLICY "Users can view own tokens" ON user_tokens
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own tokens" ON user_tokens
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tokens" ON user_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for token_transactions
CREATE POLICY "Users can view own transactions" ON token_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON token_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transcriptions
CREATE POLICY "Users can view own transcriptions" ON transcriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transcriptions" ON transcriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transcriptions" ON transcriptions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for usage_analytics
CREATE POLICY "Users can view own analytics" ON usage_analytics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analytics" ON usage_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Step 2: Enable Email Authentication

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates if needed

### Step 3: That's It!

Supabase is now integrated and ready to use!

---

## 📱 Usage in Your App

### Import the client:

```javascript
import {
  supabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getTokenBalanceFromSupabase,
  updateTokenBalanceInSupabase
} from './supabase-client';
```

### Sign up a new user:

```javascript
const { user, session } = await signUp('user@example.com', 'password123');
```

### Sign in:

```javascript
const { user, session } = await signIn('user@example.com', 'password123');
```

### Get token balance:

```javascript
const user = await getCurrentUser();
const balance = await getTokenBalanceFromSupabase(user.id);
console.log(balance); // { total_tokens, tokens_used, tokens_remaining }
```

### Update token balance:

```javascript
await updateTokenBalanceInSupabase(user.id, {
  totalTokens: 1000,
  tokensUsed: 50,
  tokensRemaining: 950
});
```

---

## 🔐 Security Features

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ Users can ONLY access their own data
- ✅ JWT token-based authentication
- ✅ Secure API keys (anon key is safe for browser use)

---

## 📊 Database Schema

### Tables Created:

1. **user_tokens** - Token balance per user
2. **token_transactions** - Transaction history
3. **transcriptions** - Optional cloud backup
4. **usage_analytics** - Usage tracking

---

## 🎯 Next Steps:

1. Run the SQL in Supabase SQL Editor
2. Test authentication in your app
3. Tokens will sync across devices automatically!

---

## 🔑 Credentials (from guides/supabase.md)

- **Project URL:** `https://kzjjkorirrrcqlhcdyqg.supabase.co`
- **Anon Key:** Already configured in `supabase-client.js`
- **Database Password:** `Pingpong5$%$%!@#$%`

---

## 💡 Benefits:

- ✅ **Sync tokens** across multiple devices
- ✅ **Backup transcriptions** to cloud (optional)
- ✅ **Multi-device access** - same account, multiple browsers
- ✅ **Usage analytics** - track your usage patterns
- ✅ **Secure authentication** - industry-standard security

---

## 🆘 Troubleshooting:

**Q: Can't connect to Supabase?**
A: Check network connection and verify project URL

**Q: Can't authenticate?**
A: Make sure you ran the SQL setup and enabled Email provider

**Q: Data not syncing?**
A: Check browser console for errors and verify user is signed in

---

## 📞 Support:

Check Supabase docs: https://supabase.com/docs
