import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import FeatureGate, { UIVisibility, PlanBadge } from './FeatureGate';
import TemplateSelector from './TemplateSelector';
import apiClient from '../services/apiClient';
import '../styles/dashboard.css';

/**
 * PlanAwareDashboard Component
 * Main dashboard that adapts based on user's subscription plan
 */
const PlanAwareDashboard = () => {
  const { user, business } = useAuth();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const userPlan = business?.subscription?.plan || 'FREE';

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/dashboard/stats');
      setStats(response.data?.data || {});
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateApplied = () => {
    setShowTemplateSelector(false);
    loadDashboardStats();
  };

  return (
    <div className="plan-aware-dashboard">
      {/* Header with Plan Info */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome, {business?.name}!</h1>
          <div className="plan-info">
            <PlanBadge businessPlan={userPlan} />
            <p className="plan-description">
              {getPlanDescription(userPlan)}
            </p>
          </div>
        </div>
      </div>

      {/* Plan-Specific UI */}
      {loading ? (
        <div className="loader">Loading dashboard...</div>
      ) : (
        <>
          {/* FREE PLAN - Starter Layer */}
          {userPlan === 'FREE' && (
            <div className="plan-specific-content">
              <div className="starter-layer">
                <div className="layer-banner">
                  <h2>🟢 Starter Layer</h2>
                  <p>Start with a ready chatbot</p>
                </div>

                <div className="feature-boxes">
                  <div className="feature-box">
                    <div className="box-icon">🤖</div>
                    <h3>One Simple Chatbot</h3>
                    <p>Lead capture bot with welcome message</p>
                    <p className="feature-meta">Auto-configured • No customization needed</p>
                  </div>

                  <div className="feature-box">
                    <div className="box-icon">💬</div>
                    <h3>100 Monthly Messages</h3>
                    <p>Limited message quota</p>
                    <p className="usage-stat">
                      {stats.messagesUsed || 0} / 100 messages used
                    </p>
                  </div>
                </div>

                <div className="upgrade-prompt free-upgrade">
                  <h3>Ready to grow?</h3>
                  <p>Upgrade to BASIC plan to unlock templates and customization</p>
                  <button className="btn btn-primary">Upgrade to Basic</button>
                </div>
              </div>
            </div>
          )}

          {/* BASIC PLAN - Template Layer */}
          {userPlan === 'BASIC' && (
            <div className="plan-specific-content">
              <div className="template-layer">
                <div className="layer-banner">
                  <h2>🔵 Template Layer</h2>
                  <p>Select a template to get started</p>
                </div>

                <UIVisibility businessPlan={userPlan} element="templates">
                  <div className="template-section">
                    <div className="template-header">
                      <h3>Available Templates</h3>
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowTemplateSelector(true)}
                      >
                        Select Template
                      </button>
                    </div>

                    <div className="template-features">
                      <div className="feature-item">
                        <span className="check">✓</span>
                        <p>Select from pre-made templates</p>
                      </div>
                      <div className="feature-item">
                        <span className="check">✓</span>
                        <p>Edit messages and settings</p>
                      </div>
                      <div className="feature-item">
                        <span className="check">✓</span>
                        <p>Up to 5 flows</p>
                      </div>
                      <div className="feature-item">
                        <span className="check">✓</span>
                        <p>1,000 monthly messages</p>
                      </div>
                    </div>
                  </div>
                </UIVisibility>

                <div className="stats-section">
                  <h3>Your Usage</h3>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-label">Flows Created</div>
                      <div className="stat-value">{stats.flowsCount || 0}/5</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Messages</div>
                      <div className="stat-value">{stats.messagesUsed || 0}/1000</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Customers</div>
                      <div className="stat-value">{stats.customersCount || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRO PLAN - Smart Custom Layer */}
          {userPlan === 'PRO' && (
            <div className="plan-specific-content">
              <div className="smart-layer">
                <div className="layer-banner">
                  <h2>🟡 Pro Smart Layer</h2>
                  <p>Build custom flows with conditional logic</p>
                </div>

                <UIVisibility businessPlan={userPlan} element="flowBuilder">
                  <div className="pro-features">
                    <div className="feature-grid">
                      <FeatureBox
                        icon="🎨"
                        title="Custom Flow Builder"
                        description="Build flows with if/else conditions"
                      />
                      <FeatureBox
                        icon="📅"
                        title="Booking + E-commerce"
                        description="Full booking and shopping integration"
                      />
                      <FeatureBox
                        icon="🆘"
                        title="Support & Feedback"
                        description="Ticket creation and review collection"
                      />
                      <FeatureBox
                        icon="📊"
                        title="Advanced Analytics"
                        description="Detailed performance insights"
                      />
                    </div>
                  </div>
                </UIVisibility>

                <div className="pro-buttons">
                  <button className="btn btn-secondary">
                    💬 Chat Simulator
                  </button>
                  <button className="btn btn-secondary">
                    🔧 Flow Builder
                  </button>
                  <button className="btn btn-secondary">
                    📊 Analytics
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ENTERPRISE PLAN - Advanced Layer */}
          {userPlan === 'ENTERPRISE' && (
            <div className="plan-specific-content">
              <div className="advanced-layer">
                <div className="layer-banner">
                  <h2>🔴 Enterprise Advanced Layer</h2>
                  <p>Full control over all features</p>
                </div>

                <div className="enterprise-features">
                  <div className="feature-grid">
                    <FeatureBox
                      icon="🚀"
                      title="Unlimited Everything"
                      description="Unlimited flows, messages, users, customization"
                    />
                    <FeatureBox
                      icon="🔗"
                      title="API Access"
                      description="Full REST API for integrations"
                    />
                    <FeatureBox
                      icon="📡"
                      title="Webhooks"
                      description="Custom webhooks for external integrations"
                    />
                    <FeatureBox
                      icon="👥"
                      title="Team Management"
                      description="Unlimited staff and permission levels"
                    />
                  </div>
                </div>

                <div className="enterprise-actions">
                  <button className="btn btn-primary">API Documentation</button>
                  <button className="btn btn-secondary">Webhook Settings</button>
                  <button className="btn btn-secondary">Team Management</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="modal-overlay">
          <TemplateSelector
            businessId={business?._id}
            onTemplateApplied={handleTemplateApplied}
            onClose={() => setShowTemplateSelector(false)}
          />
        </div>
      )}
    </div>
  );
};

/**
 * FeatureBox Component
 * Reusable component for displaying features
 */
const FeatureBox = ({ icon, title, description }) => {
  return (
    <div className="feature-box">
      <div className="box-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

function getPlanDescription(plan) {
  const descriptions = {
    FREE: 'Starter layer - Lead capture bot with no customization',
    BASIC: 'Template layer - Select templates and customize messages',
    PRO: 'Smart layer - Custom flows with conditional logic',
    ENTERPRISE: 'Advanced layer - Unlimited power and flexibility',
  };
  return descriptions[plan] || '';
}

export default PlanAwareDashboard;
