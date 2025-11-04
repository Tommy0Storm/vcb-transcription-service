/**
 * SUPABASE CLIENT - VCB TRANSCRIPTION SERVICE
 *
 * Integrates Supabase for:
 * - User authentication
 * - Token balance sync across devices
 * - Transcription backup (optional)
 * - Usage analytics
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kzjjkorirrrcqlhcdyqg.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6amprb3JpcnJyY3FsaGNkeXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTU1NzAsImV4cCI6MjA3NzY5MTU3MH0.u1A7I6bEOo6bEqROpF0EXJt9U0VbXkEUsqi4Gja3K-4';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cache missing-table warnings so we only log them once per table
const missingTableWarnings = new Set();
const missingTables = new Set();
const missingTableErrorCodes = new Set(['PGRST205', 'PGRST104', 'PGRST301']);

const STORAGE_KEY = 'vcb.supabase.missingTables';

const persistMissingTables = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(missingTables)));
  } catch (storageError) {
    console.debug('Unable to persist Supabase missing table cache:', storageError);
  }
};

if (typeof window !== 'undefined') {
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((table) => missingTables.add(table));
      }
    }
  } catch (storageError) {
    console.debug('Unable to read Supabase missing table cache:', storageError);
  }
}

const isMissingTableError = (error) => {
  if (!error) return false;
  if (missingTableErrorCodes.has(error.code)) return true;
  if (error.hint && error.hint.toLowerCase().includes('does not exist')) return true;
  if (error.message && error.message.toLowerCase().includes('could not find the table')) return true;
  return error.status === 404;
};

const warnMissingTableOnce = (tableName, error) => {
  missingTables.add(tableName);
  persistMissingTables();
  if (missingTableWarnings.has(tableName)) return;
  missingTableWarnings.add(tableName);
  console.warn(`Supabase table "${tableName}" is not available. Falling back to local-only mode.`, error);
};

const clearMissingTable = (tableName) => {
  if (!missingTables.has(tableName)) {
    return;
  }

  missingTables.delete(tableName);
  missingTableWarnings.delete(tableName);
  persistMissingTables();
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Sign up new user
 */
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) throw error;
  return data;
};

/**
 * Sign in existing user
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Get user's token balance from Supabase
 */
export const getTokenBalanceFromSupabase = async (userId) => {
  const fallback = {
    user_id: userId,
    total_tokens: 0,
    tokens_used: 0,
    tokens_remaining: 0
  };

  if (missingTables.has('user_tokens')) {
    return fallback;
  }

  const { data, error } = await supabase
    .from('user_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!error) {
    clearMissingTable('user_tokens');
    return data || fallback;
  }

  if (error.code === 'PGRST116') { // PGRST116 = no rows
    return fallback;
  }

  if (isMissingTableError(error)) {
    warnMissingTableOnce('user_tokens', error);
    return fallback;
  }

  throw error;
};

/**
 * Update token balance in Supabase
 */
export const updateTokenBalanceInSupabase = async (userId, tokenData) => {
  if (missingTables.has('user_tokens')) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_tokens')
    .upsert({
      user_id: userId,
      total_tokens: tokenData.totalTokens,
      tokens_used: tokenData.tokensUsed,
      tokens_remaining: tokenData.tokensRemaining,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('user_tokens', error);
      return null;
    }
    throw error;
  }

  clearMissingTable('user_tokens');
  return data;
};

/**
 * Record token transaction
 * @param {string} userId - User ID
 * @param {number} amount - Token amount (positive for purchase/refund, negative for usage)
 * @param {string} type - Transaction type: 'purchase', 'usage', 'refund'
 * @param {string} description - Transaction description
 * @param {string|null} paymentReference - Payment reference from PayFast (for purchases)
 */
export const recordTokenTransaction = async (userId, amount, type, description, paymentReference = null) => {
  if (missingTables.has('token_transactions')) {
    return null;
  }

  const { data, error } = await supabase
    .from('token_transactions')
    .insert({
      user_id: userId,
      amount,
      transaction_type: type, // 'purchase', 'usage', 'refund'
      description,
      payment_reference: paymentReference, // PayFast payment ID for dispute resolution
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('token_transactions', error);
      return null;
    }
    throw error;
  }

  clearMissingTable('token_transactions');
  return data;
};

/**
 * Get transaction by payment reference (for dispute resolution)
 * @param {string} paymentReference - PayFast payment reference
 * @returns {Object|null} Transaction record
 */
export const getTransactionByPaymentReference = async (paymentReference) => {
  if (missingTables.has('token_transactions')) {
    return null;
  }

  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('payment_reference', paymentReference)
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('token_transactions', error);
      return null;
    }
    // Not found is acceptable
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
};

// ============================================================================
// TRANSCRIPTION STORAGE (OPTIONAL BACKUP)
// ============================================================================

/**
 * Save transcription to Supabase (optional backup)
 */
export const saveTranscriptionToSupabase = async (userId, transcriptionData) => {
  if (missingTables.has('transcriptions')) {
    return null;
  }

  const { data, error } = await supabase
    .from('transcriptions')
    .insert({
      user_id: userId,
      file_name: transcriptionData.fileName,
      transcription_text: transcriptionData.transcriptionText,
      duration_seconds: transcriptionData.duration,
      created_at: new Date().toISOString(),
      metadata: transcriptionData.metadata || {}
    })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('transcriptions', error);
      return null;
    }
    throw error;
  }

  clearMissingTable('transcriptions');
  return data;
};

/**
 * Get user's transcriptions from Supabase
 */
export const getUserTranscriptions = async (userId, limit = 50) => {
  if (missingTables.has('transcriptions')) {
    return [];
  }

  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('transcriptions', error);
      return [];
    }
    throw error;
  }

  clearMissingTable('transcriptions');
  return data;
};

/**
 * Delete transcription from Supabase
 */
export const deleteTranscriptionFromSupabase = async (transcriptionId) => {
  if (missingTables.has('transcriptions')) {
    return;
  }

  const { error } = await supabase
    .from('transcriptions')
    .delete()
    .eq('id', transcriptionId);

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('transcriptions', error);
      return;
    }
    throw error;
  }

  clearMissingTable('transcriptions');
};

// ============================================================================
// USAGE ANALYTICS
// ============================================================================

/**
 * Record usage event
 */
export const recordUsageEvent = async (userId, eventType, eventData) => {
  if (missingTables.has('usage_analytics')) {
    return null;
  }

  const { data, error } = await supabase
    .from('usage_analytics')
    .insert({
      user_id: userId,
      event_type: eventType, // 'transcription', 'translation', 'export', etc.
      event_data: eventData,
      created_at: new Date().toISOString()
    });

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('usage_analytics', error);
      return null;
    }
    throw error;
  }

  clearMissingTable('usage_analytics');
  return data;
};

/**
 * Get usage statistics
 */
export const getUsageStatistics = async (userId, startDate, endDate) => {
  if (missingTables.has('usage_analytics')) {
    return [];
  }

  const { data, error } = await supabase
    .from('usage_analytics')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('usage_analytics', error);
      return [];
    }
    throw error;
  }

  clearMissingTable('usage_analytics');
  return data;
};

// ============================================================================
// AUDIT LOGGING - For dispute resolution and compliance
// ============================================================================

/**
 * Log user session and activity events
 * Tracks: logins, POPIA acceptance, transcriptions, downloads, all user actions
 */
export const logAuditEvent = async (userId, eventType, eventData = {}) => {
  try {
    // Get client IP address (best effort - may be limited by browser)
    let ipAddress = 'unknown';
    try {
      // Try to get IP from browser (limited by privacy controls)
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      ipAddress = data.ip;
    } catch (ipError) {
      console.log('Could not fetch IP address:', ipError);
    }

    // Get browser and device info
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenResolution = `${window.screen.width}x${window.screen.height}`;

    const auditEntry = {
      user_id: userId,
      event_type: eventType,
      event_data: {
        ...eventData,
        ip_address: ipAddress,
        user_agent: userAgent,
        platform: platform,
        language: language,
        screen_resolution: screenResolution,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(auditEntry);

    if (error) {
      if (isMissingTableError(error)) {
        warnMissingTableOnce('audit_logs', error);
        return null;
      }
      throw error;
    }
    clearMissingTable('audit_logs');
    return data;
  } catch (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce('audit_logs', error);
    } else {
      console.error('Failed to log audit event:', error);
    }
    // Don't throw - audit logging should never break the app
    return null;
  }
};

/**
 * Log user session start (login)
 */
export const logSessionStart = async (userId, userEmail) => {
  return logAuditEvent(userId, 'SESSION_START', {
    email: userEmail,
    action: 'User logged in'
  });
};

/**
 * Log user session end (logout)
 */
export const logSessionEnd = async (userId) => {
  return logAuditEvent(userId, 'SESSION_END', {
    action: 'User logged out'
  });
};

/**
 * Log POPIA acceptance
 */
export const logPOPIAAcceptance = async (userId) => {
  return logAuditEvent(userId, 'POPIA_ACCEPTED', {
    action: 'User accepted POPIA terms',
    agreement_type: 'POPIA Compliance',
    accepted_at: new Date().toISOString()
  });
};

/**
 * Log transcription started
 */
export const logTranscriptionStart = async (userId, fileData) => {
  return logAuditEvent(userId, 'TRANSCRIPTION_START', {
    action: 'Transcription initiated',
    file_name: fileData.fileName,
    file_size: fileData.fileSize,
    file_type: fileData.fileType,
    duration: fileData.duration,
    processing_tier: fileData.processingTier
  });
};

/**
 * Log transcription completed
 */
export const logTranscriptionComplete = async (userId, fileData, tokensUsed) => {
  return logAuditEvent(userId, 'TRANSCRIPTION_COMPLETE', {
    action: 'Transcription completed successfully',
    file_name: fileData.fileName,
    tokens_used: tokensUsed,
    duration: fileData.duration,
    success: true,
    completion_time: new Date().toISOString()
  });
};

/**
 * Log transcription failed
 */
export const logTranscriptionFailed = async (userId, fileData, errorMessage) => {
  return logAuditEvent(userId, 'TRANSCRIPTION_FAILED', {
    action: 'Transcription failed',
    file_name: fileData.fileName,
    error: errorMessage,
    success: false
  });
};

/**
 * Log download initiated
 */
export const logDownloadStart = async (userId, fileData, downloadType) => {
  return logAuditEvent(userId, 'DOWNLOAD_START', {
    action: 'Download initiated',
    file_name: fileData.fileName,
    download_type: downloadType, // 'transcript', 'analysis', 'audio', 'zip'
    initiated_at: new Date().toISOString()
  });
};

/**
 * Log download completed successfully
 */
export const logDownloadComplete = async (userId, fileData, downloadType) => {
  return logAuditEvent(userId, 'DOWNLOAD_COMPLETE', {
    action: 'Download completed successfully',
    file_name: fileData.fileName,
    download_type: downloadType,
    success: true,
    completed_at: new Date().toISOString()
  });
};

/**
 * Log download failed
 */
export const logDownloadFailed = async (userId, fileData, downloadType, errorMessage) => {
  return logAuditEvent(userId, 'DOWNLOAD_FAILED', {
    action: 'Download failed',
    file_name: fileData.fileName,
    download_type: downloadType,
    error: errorMessage,
    success: false
  });
};

/**
 * Log token purchase
 */
export const logTokenPurchase = async (userId, amount, packageType) => {
  return logAuditEvent(userId, 'TOKEN_PURCHASE', {
    action: 'Tokens purchased',
    amount: amount,
    package_type: packageType,
    purchased_at: new Date().toISOString()
  });
};

/**
 * Get audit logs for a user (for admin/user review)
 */
export const getUserAuditLogs = async (userId, limit = 100) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Send login notification email to user
 * This function logs the login to database and can be extended to send actual emails
 */
export const sendLoginNotification = async (userId, userEmail, ipAddress, userAgent) => {
  // Skip if table is known to be missing
  if (missingTables.has('email_notifications')) {
    return null;
  }

  try {
    // Log the email notification event
    const { data, error } = await supabase
      .from('email_notifications')
      .insert({
        user_id: userId,
        notification_type: 'LOGIN_ALERT',
        recipient_email: userEmail,
        email_data: {
          subject: 'New Login to Your VCB Transcription Account',
          message: `A new login was detected to your account.`,
          login_time: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          location: 'Unknown' // Can be enhanced with IP geolocation
        },
        sent_at: new Date().toISOString()
      });

    if (error) {
      if (isMissingTableError(error)) {
        warnMissingTableOnce('email_notifications', error);
        return null;
      }
      throw error;
    }

    clearMissingTable('email_notifications');
    console.log('Login notification logged for user:', userEmail);
    return data;
  } catch (error) {
    console.error('Failed to send login notification:', error);
    // Don't throw - email notifications should never break the app
    return null;
  }
};

// ============================================================================
// USER DATA EXPORT (POPIA Right to Portability)
// ============================================================================

/**
 * Export all user data for POPIA compliance
 * @param {string} userId - User ID to export data for
 * @returns {Object} Complete user data export
 */
export const exportUserData = async (userId) => {
  try {
    console.log('Exporting user data for:', userId);

    // Fetch all user data in parallel
    const [tokens, transactions, logs, transcriptions] = await Promise.all([
      // Token balance
      getTokenBalanceFromSupabase(userId),

      // Token transactions
      supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Audit logs (last 1000 records)
      getUserAuditLogs(userId, 1000),

      // Transcriptions (if any - this table is optional)
      supabase
        .from('transcriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    // Get user profile info
    const { data: { user } } = await supabase.auth.getUser();

    return {
      user_profile: {
        id: user?.id,
        email: user?.email,
        created_at: user?.created_at
      },
      token_balance: tokens,
      token_transactions: transactions.data || [],
      audit_logs: logs || [],
      transcriptions: transcriptions.data || [],
      export_metadata: {
        exported_at: new Date().toISOString(),
        export_version: '1.0',
        data_retention_days: 60
      }
    };
  } catch (error) {
    console.error('Failed to export user data:', error);
    throw error;
  }
};

/**
 * Download user data as JSON file
 * @param {string} userId - User ID
 */
export const downloadUserData = async (userId) => {
  const userData = await exportUserData(userId);
  const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vcb-user-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ============================================================================
// DATABASE SETUP SQL (Run these in Supabase SQL Editor)
// ============================================================================

export const SETUP_SQL = `
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
  payment_reference VARCHAR(255), -- PayFast payment ID for dispute resolution
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

-- ============================================================================
-- AUDIT LOGS TABLE - Comprehensive session and activity tracking
-- Keeps logs for 60 days for dispute resolution
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);

-- Function to automatically delete audit logs older than 60 days
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Uncomment these lines if pg_cron is enabled in your Supabase project:
-- SELECT cron.schedule('delete-old-audit-logs', '0 2 * * *', 'SELECT delete_old_audit_logs();');

-- Manual cleanup command (run periodically if pg_cron is not available):
-- SELECT delete_old_audit_logs();

-- ============================================================================
-- EMAIL NOTIFICATIONS TABLE - Track all email notifications sent to users
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  email_data JSONB NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at ON email_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(notification_type);

-- Index for payment reference lookups (dispute resolution)
CREATE INDEX IF NOT EXISTS idx_token_transactions_payment_ref ON token_transactions(payment_reference);

-- Enable Row Level Security
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for audit_logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- NOTE: Only allow INSERT and SELECT - users cannot UPDATE or DELETE audit logs for integrity

-- RLS Policies for email_notifications
CREATE POLICY "Users can view own email notifications" ON email_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email notifications" ON email_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
`;
