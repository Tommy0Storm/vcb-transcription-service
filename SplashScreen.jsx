import React, { useEffect, useMemo, useState } from 'react';
import { supabase, signIn, signUp } from './supabase-client';

const SplashScreen = ({ onLoginSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const videoPath = useMemo(() => {
    try {
      return new URL('./VCB-Transcript-Video.mp4', import.meta.url).href;
    } catch (error) {
      console.error('Splash video asset missing:', error);
      return '';
    }
  }, []);

  useEffect(() => {
    // autoplay policy: try to play muted
    const vid = document.getElementById('vcb-splash-video');
    if (vid && videoPath) {
      vid.muted = true;
      vid.play().catch(() => {});
    }
  }, [videoPath]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in via splash screen:', session.user.email);
        setShowModal(false);
        if (onLoginSuccess) onLoginSuccess(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [onLoginSuccess]);

  const handleVideoClick = () => {
    // Open the login modal while ensuring the intro keeps playing smoothly
    const vid = document.getElementById('vcb-splash-video');
    if (vid) {
      vid.play().catch(() => {});
    }
    setShowModal(true);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      // Auth state change handler will take care of closing modal
    } catch (err) {
      setError(err.message || 'Sign in failed');
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUp(email, password);
      setError(null);
      // Show message about email verification
      alert('Account created! Please check your email to verify your account.');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000'
    }}>
      <style>{`
        .vcb-splash-video {
          width: min(80vw, 1100px);
          height: auto;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          cursor: pointer;
        }
        .vcb-modal { position: absolute; top: 12%; right: 12%; background: rgba(255,255,255,0.98); padding: 20px; border-radius: 10px; width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);} 
      `}</style>

      {videoPath ? (
        <video
          id="vcb-splash-video"
          className="vcb-splash-video"
          src={videoPath}
          playsInline
          loop
          muted
          onClick={handleVideoClick}
        />
      ) : (
        <div style={{ color: '#fff', textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.08em' }}>VCB TRANSCRIPTION SERVICE</p>
          <p style={{ maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>Splash video is missing. Please add <code>VCB-Transcript-Video.mp4</code> to the project root to enable the animated intro.</p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{ marginTop: 16, padding: '12px 28px', background: '#fff', color: '#000', borderRadius: 999, border: '1px solid #fff', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign In
          </button>
        </div>
      )}

      {showModal && (
        <div className="vcb-modal" role="dialog" aria-modal="true">
          <h3 style={{ marginTop: 0 }}>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h3>

          <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                autoComplete="email"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD' }} 
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6} 
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD' }} 
              />
            </div>

            {error && (<div style={{ color: '#c0392b', marginBottom: 8, fontSize: 13 }}>{error}</div>)}

            <button 
              type="submit" 
              disabled={loading} 
              style={{ width: '100%', padding: '10px', background: '#000', color: '#fff', borderRadius: 6, border: 'none', cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Please wait...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ marginTop: 10, fontSize: 13, color: '#555' }}>
            {authMode === 'signin' ? (
              <>Don't have an account? <button onClick={() => setAuthMode('signup')} style={{ background: 'none', border: 'none', color: '#000', textDecoration: 'underline', cursor: 'pointer' }}>Create one</button></>
            ) : (
              <>Already have an account? <button onClick={() => setAuthMode('signin')} style={{ background: 'none', border: 'none', color: '#000', textDecoration: 'underline', cursor: 'pointer' }}>Sign in</button></>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
