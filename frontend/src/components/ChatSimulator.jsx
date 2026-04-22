import React, { useState } from 'react';
import apiClient from '../services/apiClient';
import '../styles/chat-simulator.css';

/**
 * ChatSimulator Component
 * Test your chatbot flows without connecting to WhatsApp
 */
const ChatSimulator = ({ businessId }) => {
  const [phone, setPhone] = useState('+1234567890');
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hi! 👋 How can I help you?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [showSessionInfo, setShowSessionInfo] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { type: 'user', text: inputMessage }
    ]);

    try {
      setLoading(true);

      // Send to chatbot engine
      const response = await apiClient.post('/api/chat/simulate', {
        businessId,
        phone,
        message: inputMessage,
      });

      const { response: botResponse, sessionData } = response.data?.data || {};

      // Add bot response
      if (botResponse) {
        setMessages((prev) => [
          ...prev,
          { type: 'bot', text: botResponse }
        ]);
      }

      // Store session info
      if (sessionData) {
        setSessionInfo(sessionData);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { type: 'bot', text: '❌ Error: ' + (error.response?.data?.message || 'Something went wrong') }
      ]);
    } finally {
      setLoading(false);
      setInputMessage('');
    }
  };

  const resetChat = () => {
    setMessages([{ type: 'bot', text: 'Chat reset. Hi! 👋 How can I help you?' }]);
    setSessionInfo(null);
  };

  return (
    <div className="chat-simulator">
      <div className="simulator-header">
        <h2>🤖 Chat Simulator</h2>
        <p>Test your chatbot flows in real-time</p>
      </div>

      <div className="simulator-container">
        {/* Chat Display */}
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.type}`}>
              <div className="message-content">
                {msg.type === 'bot' && <span className="bot-icon">🤖</span>}
                {msg.type === 'user' && <span className="user-icon">👤</span>}
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message message-bot">
              <div className="message-content">
                <span className="bot-icon">🤖</span>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="simulator-footer">
          <div className="phone-input">
            <label>Test Phone:</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>

          <div className="message-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim()}
              className="btn-send"
            >
              Send
            </button>
          </div>

          <div className="simulator-actions">
            <button
              onClick={resetChat}
              className="btn btn-secondary"
            >
              Reset Chat
            </button>
            <button
              onClick={() => setShowSessionInfo(!showSessionInfo)}
              className="btn btn-secondary"
            >
              📊 Session Info
            </button>
          </div>
        </div>
      </div>

      {/* Session Info Panel */}
      {showSessionInfo && sessionInfo && (
        <div className="session-info-panel">
          <h3>📋 Session Information</h3>
          <div className="session-data">
            <div className="data-row">
              <span className="key">Current Step:</span>
              <span className="value">{sessionInfo.currentStep}</span>
            </div>
            <div className="data-row">
              <span className="key">Awaiting Field:</span>
              <span className="value">{sessionInfo.awaitingField || 'None'}</span>
            </div>
            <div className="data-row">
              <span className="key">Collected Data:</span>
              <span className="value">
                <pre>{JSON.stringify(sessionInfo.collectedData, null, 2)}</pre>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSimulator;
