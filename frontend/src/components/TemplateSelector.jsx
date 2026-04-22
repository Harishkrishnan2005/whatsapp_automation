import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import '../styles/template-selector.css';

/**
 * TemplateSelector Component
 * Allows users to select and apply templates based on their plan
 */
const TemplateSelector = ({ businessId, onTemplateApplied, onClose }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch available templates on mount
  useEffect(() => {
    fetchAvailableTemplates();
  }, []);

  const fetchAvailableTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/templates');
      setTemplates(response.data?.data || []);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      setError('Please select a template first');
      return;
    }

    try {
      setApplying(true);
      setError(null);

      const response = await apiClient.post(
        `/api/templates/${selectedTemplate.name}/apply`,
        { category: selectedTemplate.category }
      );

      setSuccess(`Template "${selectedTemplate.name}" applied successfully!`);
      
      if (onTemplateApplied) {
        onTemplateApplied(response.data?.data);
      }

      // Auto close after success
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="template-selector template-loading">
        <div className="loader">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="template-selector">
      <div className="template-header">
        <h2>Select a Template</h2>
        <p>Choose a pre-made flow to get started instantly</p>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="templates-grid">
        {templates.length === 0 ? (
          <p className="no-templates">No templates available for your plan</p>
        ) : (
          templates.map((template) => (
            <div
              key={template._id}
              className={`template-card ${
                selectedTemplate?._id === template._id ? 'selected' : ''
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              <div className="template-icon">
                {getTemplateIcon(template.name)}
              </div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <div className="template-flows">
                <span className="badge">{template.flows?.length} flows</span>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTemplate && (
        <div className="template-details">
          <h3>Selected: {selectedTemplate.name}</h3>
          <p>{selectedTemplate.description}</p>
          <div className="flows-preview">
            <h4>Flow Preview:</h4>
            <ul>
              {selectedTemplate.flows?.slice(0, 3).map((flow, idx) => (
                <li key={idx}>
                  <strong>{flow.step}:</strong> {flow.trigger} → {flow.nextStep}
                </li>
              ))}
              {selectedTemplate.flows?.length > 3 && (
                <li>... and {selectedTemplate.flows.length - 3} more</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="template-actions">
        <button
          className="btn btn-secondary"
          onClick={onClose}
          disabled={applying}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleApplyTemplate}
          disabled={!selectedTemplate || applying}
        >
          {applying ? 'Applying...' : 'Apply Template'}
        </button>
      </div>
    </div>
  );
};

function getTemplateIcon(templateName) {
  const icons = {
    booking: '📅',
    ecommerce: '🛍️',
    support: '🆘',
    feedback: '⭐',
    'lead-capture': '📋',
  };
  return icons[templateName] || '🤖';
}

export default TemplateSelector;
