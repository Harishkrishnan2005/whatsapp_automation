import React, { useState, useEffect } from 'react';
import { getFeatureAccess, PLAN_CONFIG } from '../config/plans';
import apiClient from '../services/apiClient';
import '../styles/features.css';

/**
 * FeatureProvider Component
 * Wraps the app to provide feature-based access control
 * Usage: Check if a feature is available before rendering UI
 */
export const FeatureProvider = ({ children, businessPlan }) => {
  const hasFeature = (featureName) => {
    return getFeatureAccess(businessPlan, featureName);
  };

  const getFeatureDetails = (featureName) => {
    const plan = PLAN_CONFIG[businessPlan];
    return plan?.features[featureName];
  };

  return (
    <div className="feature-provider">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { hasFeature, getFeatureDetails });
        }
        return child;
      })}
    </div>
  );
};

/**
 * FeatureGate Component
 * Conditionally renders children based on feature availability
 * Usage: <FeatureGate feature="customization"><FlowBuilder /></FeatureGate>
 */
export const FeatureGate = ({ 
  feature, 
  businessPlan, 
  children, 
  fallback = null,
  upgradeMessage = true 
}) => {
  const planConfig = PLAN_CONFIG[businessPlan];
  const hasAccess = planConfig?.features[feature]?.enabled || false;

  if (hasAccess) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  if (upgradeMessage) {
    return (
      <div className="feature-locked">
        <div className="feature-locked-content">
          <div className="lock-icon">🔒</div>
          <h3>Feature Locked</h3>
          <p>This feature is not available in your current plan.</p>
          <button className="btn-upgrade">
            Upgrade to Pro or Enterprise
          </button>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * PlanBadge Component
 * Shows current plan badge with feature summary
 */
export const PlanBadge = ({ businessPlan }) => {
  const plan = PLAN_CONFIG[businessPlan];
  
  return (
    <div className={`plan-badge plan-${businessPlan.toLowerCase()}`}>
      <div className="plan-name">{plan?.name}</div>
      <div className="plan-mode">{plan?.mode}</div>
    </div>
  );
};

/**
 * UIVisibility Component
 * Uses plan UI configuration to show/hide UI elements
 */
export const UIVisibility = ({ businessPlan, element, children }) => {
  const plan = PLAN_CONFIG[businessPlan];
  const uiConfig = plan?.ui;

  // Map element names to UI config keys
  const elementMap = {
    'flowBuilder': 'showFlowBuilder',
    'templates': 'showTemplates',
    'customization': 'showCustomization',
    'multiUser': 'showMultiUser',
  };

  const configKey = elementMap[element];
  if (!configKey) return children;

  const isVisible = uiConfig?.[configKey] || false;

  if (!isVisible) {
    return null;
  }

  return children;
};

/**
 * UpgradePrompt Component
 * Shows a prompt to upgrade for a specific feature
 */
export const UpgradePrompt = ({ 
  currentPlan, 
  requiredFeature, 
  onUpgradeClick 
}) => {
  const requiredPlan = findPlanWithFeature(requiredFeature);
  
  return (
    <div className="upgrade-prompt">
      <div className="upgrade-icon">⬆️</div>
      <h3>Upgrade Required</h3>
      <p>
        This feature is available in <strong>{requiredPlan}</strong> plan and above.
      </p>
      <button onClick={onUpgradeClick} className="btn-upgrade-now">
        Upgrade Now
      </button>
    </div>
  );
};

function findPlanWithFeature(featureName) {
  const plans = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
  
  for (const plan of plans) {
    const features = PLAN_CONFIG[plan]?.features || {};
    if (features[featureName]?.enabled) {
      return plan;
    }
  }
  
  return 'ENTERPRISE';
}

export default FeatureGate;
