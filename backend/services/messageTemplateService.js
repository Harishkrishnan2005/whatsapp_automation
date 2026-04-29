import Business from '../models/Business.js';
import MessageTemplate from '../models/MessageTemplate.js';
import { getBusinessPlanConfig, resolveBusinessPlan, resolvePlanName } from '../config/plans.js';

export const DEFAULT_MESSAGE_TEMPLATES = [
  {
    name: 'GREETING',
    category: 'UTILITY',
    content: 'Hi {{1}}, welcome! What is your name?',
    variables: ['name'],
  },
  {
    name: 'ORDER_CONFIRMATION',
    category: 'UTILITY',
    content: 'Hi {{1}}, your order {{2}} is confirmed. Details: {{3}}. Business: {{4}}.',
    variables: ['name', 'orderId', 'details', 'business'],
  },
  {
    name: 'PAYMENT_CONFIRMATION',
    category: 'UTILITY',
    content: 'Hi {{1}}, we received your payment for order {{2}}.',
    variables: ['name', 'orderId'],
  },
  {
    name: 'REMINDER',
    category: 'UTILITY',
    content: 'Hi {{1}}, this is your reminder for {{2}} on {{3}}.',
    variables: ['name', 'type', 'date'],
  },
  {
    name: 'CANCELLATION',
    category: 'UTILITY',
    content: 'Hi {{1}}, your {{2}} has been cancelled.',
    variables: ['name', 'type'],
  },
  {
    name: 'SUPPORT_FOLLOWUP',
    category: 'UTILITY',
    content: 'Hi {{1}}, thanks for reaching out. Our support team is here to help.',
    variables: ['name'],
  },
  {
    name: 'OTP',
    category: 'AUTH',
    content: 'Hi {{1}}, your verification code is {{2}}.',
    variables: ['name', 'otp'],
  },
  {
    name: 'ORDER_STATUS',
    category: 'UTILITY',
    content: 'Hi {{1}}, your order {{2}} is currently {{3}}. Details: {{4}}. Business: {{5}}.',
    variables: ['name', 'orderId', 'status', 'details', 'business'],
  },
  {
    name: 'PAYMENT_LINK',
    category: 'UTILITY',
    content: 'Hi {{1}}, amount due is {{2}}. Limit: {{3}}. Pay here: {{4}}.',
    variables: ['name', 'amount', 'limit', 'link'],
  },
  {
    name: 'RETURN_REFUND',
    category: 'UTILITY',
    content: 'Hi {{1}}, return/refund for order {{2}} is now {{3}}.',
    variables: ['name', 'orderId', 'status'],
  },
];

class MessageTemplateService {
  normalizeTemplateName(name = '') {
    return String(name || '').trim().toUpperCase();
  }

  async seedDefaultTemplates() {
    await Promise.all(
      DEFAULT_MESSAGE_TEMPLATES.map((template) =>
        MessageTemplate.findOneAndUpdate(
          {
            businessId: null,
            name: this.normalizeTemplateName(template.name),
            isDefault: true,
          },
          {
            $set: {
              category: template.category,
              content: template.content,
              variables: template.variables,
              status: 'APPROVED',
              isDefault: true,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        )
      )
    );
  }

  resolveVariable(path, context = {}) {
    const normalizedPath = String(path || '').trim();
    if (!normalizedPath) return undefined;

    return normalizedPath.split('.').reduce((accumulator, key) => {
      if (accumulator && typeof accumulator === 'object' && key in accumulator) {
        return accumulator[key];
      }
      return undefined;
    }, context);
  }

  getValueAtPath(source, path) {
    return this.resolveVariable(path, source);
  }

  resolveTemplateData(variableMapping = {}, sources = {}) {
    const resolvedData = {};

    Object.entries(variableMapping || {}).forEach(([variable, path]) => {
      const value = this.getValueAtPath(sources, path);
      if (value !== undefined && value !== null && value !== '') {
        resolvedData[variable] = value;
      }
    });

    return resolvedData;
  }

  renderTemplate(template, data = {}) {
    const variables = Array.isArray(template?.variables) ? template.variables : [];
    const content = String(template?.content || '');

    return content.replace(/\{\{(\d+)\}\}/g, (match, rawIndex) => {
      const variableName = variables[Number(rawIndex) - 1];
      if (!variableName) {
        return match;
      }

      const value = data[variableName];
      return value === undefined || value === null || value === '' ? match : String(value);
    });
  }

  async getBusinessPlan(businessId) {
    const business = await Business.findById(businessId)
      .select('plan subscription.plan')
      .lean();

    if (!business) {
      throw new Error('Business not found');
    }

    return {
      business,
      plan: resolveBusinessPlan(business),
      config: getBusinessPlanConfig(business),
    };
  }

  assertTemplateCreationAllowed(planName) {
    const plan = resolvePlanName(planName);
    if (!['PRO', 'ENTERPRISE'].includes(plan)) {
      throw new Error('Custom template creation is available only for PRO and ENTERPRISE plans');
    }
  }

  assertTemplateUsageAllowed(planName, template) {
    const plan = resolvePlanName(planName);
    const config = getBusinessPlanConfig({ plan });

    if (!config.templates) {
      throw new Error('Templates are not available on the FREE plan');
    }

    if (plan === 'BASIC' && !template?.isDefault) {
      throw new Error('BASIC plan can only use approved default templates');
    }

    if (template?.status !== 'APPROVED') {
      throw new Error('Template is not approved yet');
    }
  }

  async findTemplate({ businessId, templateName, planName = null, enforceAccess = true }) {
    const normalizedName = this.normalizeTemplateName(templateName);
    if (!normalizedName) {
      return null;
    }

    const businessTemplate = businessId
      ? await MessageTemplate.findOne({
          businessId,
          name: normalizedName,
        })
      : null;
    const defaultTemplate = await MessageTemplate.findOne({
      businessId: null,
      name: normalizedName,
      isDefault: true,
    });

    const candidates = [businessTemplate, defaultTemplate].filter(Boolean);

    if (!candidates.length) {
      return null;
    }

    if (!enforceAccess || !planName) {
      return candidates[0];
    }

    for (const template of candidates) {
      try {
        this.assertTemplateUsageAllowed(planName, template);
        return template;
      } catch {
        continue;
      }
    }

    this.assertTemplateUsageAllowed(planName, candidates[0]);
    return candidates[0];
  }

  async listTemplatesForBusiness(businessId) {
    const { plan } = await this.getBusinessPlan(businessId);

    const templates = await MessageTemplate.find({
      $or: [{ businessId }, { businessId: null, isDefault: true }],
    })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return templates.filter((template) => {
      if (String(template.businessId || '') === String(businessId)) {
        return ['PRO', 'ENTERPRISE'].includes(resolvePlanName(plan));
      }

      try {
        this.assertTemplateUsageAllowed(plan, template);
        return true;
      } catch {
        return false;
      }
    });
  }

  async createTemplateForBusiness(businessId, payload = {}) {
    const { plan } = await this.getBusinessPlan(businessId);
    this.assertTemplateCreationAllowed(plan);

    const template = await MessageTemplate.create({
      businessId,
      name: this.normalizeTemplateName(payload.name),
      category: payload.category || 'UTILITY',
      content: payload.content,
      variables: Array.isArray(payload.variables) ? payload.variables : [],
      status: 'PENDING',
      isDefault: false,
    });

    return template;
  }

  async updateTemplateStatus(businessId, templateId, status) {
    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (!['APPROVED', 'PENDING', 'REJECTED'].includes(normalizedStatus)) {
      throw new Error('Invalid template status');
    }

    const template = await MessageTemplate.findOneAndUpdate(
      {
        _id: templateId,
        businessId,
        isDefault: false,
      },
      {
        $set: {
          status: normalizedStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!template) {
      throw new Error('Template not found');
    }

    return template;
  }
}

export default new MessageTemplateService();
