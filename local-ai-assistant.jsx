import React, { useState, useEffect } from 'react';
import { supabase } from './supabase-client';
import './q-assistant.css';

const LocalAIAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setMessages([]);
        setIsOpen(false);
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
        body: JSON.stringify({ message: userInput })
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

  if (!isOpen) {
    return (
      <button
        type="button"
        className="q-assistant-launcher"
        onClick={() => setIsOpen(true)}
      >
        <span style={{ fontWeight: 600 }}>VCB AI Assistant</span>
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
          placeholder="Ask about transcription services..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default LocalAIAssistant;