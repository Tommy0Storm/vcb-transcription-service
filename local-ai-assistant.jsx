import React, { useState, useEffect } from 'react';
import { supabase } from './supabase-client';
import './q-assistant.css';

const LocalAIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showBadge, setShowBadge] = useState(true);

  // Auto-open after 3 seconds and show welcome message
  useEffect(() => {
    const hasVisited = localStorage.getItem('vcb_ai_assistant_visited');

    if (!hasVisited) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem('vcb_ai_assistant_visited', 'true');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  // Show welcome message when opened
  useEffect(() => {
    if (isOpen && session && !hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      setMessages([{
        role: 'assistant',
        content: '👋 Hi there! I\'m your VCB AI Assistant. I can help you with:\n\n• 📝 Transcription questions\n• 🌍 Translation services\n• 💰 Token packages\n• 🔧 Technical support\n• 📊 Job quotations & estimates\n• 🛒 Component pricing (with online search)\n\nWhat can I help you with today?'
      }]);
      setShowBadge(false);
    }
  }, [isOpen, session, hasGreeted, messages.length]);

  // Periodic "nudge" if assistant is closed
  useEffect(() => {
    if (!isOpen && session) {
      const nudgeTimer = setInterval(() => {
        setShowBadge(true);
      }, 60000); // Show badge every minute

      return () => clearInterval(nudgeTimer);
    }
  }, [isOpen, session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setMessages([]);
        setIsOpen(false);
        setHasGreeted(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendMessage = async () => {
  if (!input.trim() || !session) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
      if (!proxyUrl) {
        throw new Error('Gemini proxy URL not configured');
      }

      const response = await fetch(`${proxyUrl}/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: userInput,
          systemPrompt: `You are a helpful VCB AI Assistant that can:
1. Answer questions about transcription and translation services
2. Help with token packages and pricing
3. Create professional job quotations with:
   - Web search for component/material prices
   - 30% markup on all materials
   - Hourly labor rate estimates
   - R300 daily travel cost
4. Provide technical support

When asked to create a quote:
- Search online for current prices of components/materials
- List each item with base price
- Apply 30% markup to materials
- Add estimated hours × hourly rate
- Add R300 travel cost (once per day)
- Format as professional quotation

Always be helpful, professional, and accurate.`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);

    } catch (error) {
      console.error('AI Assistant Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const [isListening, setIsListening] = useState(false);

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className={`q-assistant-launcher ${showBadge ? 'q-assistant-pulse' : ''}`}
        onClick={() => {
          setIsOpen(true);
          setShowBadge(false);
        }}
      >
        {showBadge && <span className="q-assistant-badge">1</span>}
        <span style={{ fontWeight: 600 }}>💬 VCB AI Assistant</span>
      </button>
    );
  }

  const renderHeader = () => (
    <div className="q-assistant-header">
      <div>
        <div className="q-assistant-title">VCB AI Assistant</div>
        <div className="q-assistant-subtitle">VCB-AI - Powered help for your workflow</div>
      </div>
      <button
        type="button"
        className="q-assistant-minimise"
        onClick={() => setIsOpen(false)}
        aria-label="Minimise assistant"
      >
        _
      </button>
    </div>
  );

  if (!session) {
    return (
      <div className="q-assistant-widget">
        {renderHeader()}
        <div className="q-assistant-login">
          <p>Please log in to use AI Assistant</p>
        </div>
      </div>
    );
  }

  return (
    <div className="q-assistant-widget">
      {renderHeader()}
      <div className="q-assistant-messages">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`q-assistant-message q-assistant-message-${msg.role}`}
          >
            <div className="q-assistant-content">{msg.content}</div>
          </div>
        ))}
        {loading && <div className="q-assistant-loading">AI is thinking...</div>}
      </div>
      
      <div className="q-assistant-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={isListening ? "🎤 Listening..." : "Ask about transcription services..."}
          disabled={loading || isListening}
        />
        <button
          type="button"
          onClick={startVoiceInput}
          disabled={loading || isListening}
          className={`q-assistant-mic-button ${isListening ? 'listening' : ''}`}
          title="Voice input"
        >
          🎤
        </button>
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default LocalAIAssistant;