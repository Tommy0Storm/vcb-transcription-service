import React, { useState, useEffect } from 'react';
import { supabase } from './supabase-client';
import './q-assistant.css';

const QAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setMessages([]);
        setConversationId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !session) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const proxyBaseUrl = import.meta.env.VITE_Q_PROXY_URL;
      if (!proxyBaseUrl) {
        throw new Error('Q proxy URL is not configured');
      }

      const response = await fetch(`${proxyBaseUrl}/q/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: input,
          conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        sources: data.sourceAttributions
      }]);
      
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

    } catch (error) {
      console.error('Q Assistant Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, the assistant hit a snag. Please try again in a moment.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="q-assistant-login">
        <p>Please log in to use Q Assistant</p>
      </div>
    );
  }

  return (
    <div className="q-assistant-widget">
      <div className="q-assistant-messages">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`q-assistant-message q-assistant-message-${msg.role}`}
          >
            <div className="q-assistant-content">{msg.content}</div>
            {msg.sources?.length > 0 && (
              <div className="q-assistant-sources">
                {msg.sources.map((source, i) => (
                  <span key={`${idx}-${i}`} className="q-assistant-source">
                    {source.title || 'Source'}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="q-assistant-loading">Q is thinking...</div>}
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
          placeholder="Ask Q anything..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default QAssistant;