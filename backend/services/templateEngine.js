import messageService from './messageService.js';
import messageTemplateService from './messageTemplateService.js';
import logger from '../utils/logger.js';

class TemplateEngine {
  FALLBACK_MESSAGE = 'Please try again or contact support';

  resolveVariable(path, context = {}) {
    return messageTemplateService.resolveVariable(path, context);
  }

  mapVariables(template, variableMapping = {}, context = {}) {
    const resolvedVariables = {};
    const mappedVariables = {};
    const templateVariables = Array.isArray(template?.variables) ? template.variables : [];

    Object.entries(variableMapping || {}).forEach(([slot, path]) => {
      const value = this.resolveVariable(path, context);
      const numericSlot = Number.parseInt(slot, 10);
      const variableName = Number.isInteger(numericSlot) && numericSlot > 0
        ? templateVariables[numericSlot - 1]
        : slot;

      mappedVariables[slot] = {
        path,
        value: value ?? null,
      };

      if (variableName) {
        resolvedVariables[variableName] = value ?? '';
      }
    });

    return {
      resolvedVariables,
      mappedVariables,
    };
  }

  async prepareTemplate({ businessId, templateName, variableMapping = {}, context = {}, planName = null }) {
    let resolvedTemplate = null;

    try {
      resolvedTemplate = await messageTemplateService.findTemplate({
        businessId,
        templateName,
        planName,
        enforceAccess: true,
      });
    } catch (error) {
      logger.warn('[TemplateEngine] Template access blocked or template lookup failed', {
        businessId: String(businessId || ''),
        templateName,
        error: error.message,
      });

      return {
        ok: false,
        fallbackText: this.FALLBACK_MESSAGE,
        templateName,
        mappedVariables: {},
        error: error.message,
      };
    }

    if (!resolvedTemplate) {
      return {
        ok: false,
        fallbackText: this.FALLBACK_MESSAGE,
        templateName,
        mappedVariables: {},
      };
    }

    const { resolvedVariables, mappedVariables } = this.mapVariables(
      resolvedTemplate,
      variableMapping,
      context
    );

    const renderedMessage = messageTemplateService.renderTemplate(
      resolvedTemplate,
      resolvedVariables
    );

    return {
      ok: true,
      resolvedTemplate,
      renderedMessage,
      resolvedVariables,
      mappedVariables,
      templateName: resolvedTemplate.name,
    };
  }

  async sendTemplate({
    businessId,
    templateName,
    variableMapping = {},
    context = {},
    planName = null,
    customer,
    phone,
    senderType = 'chatbot',
    products = [],
  }) {
    const preparedTemplate = await this.prepareTemplate({
      businessId,
      templateName,
      variableMapping,
      context,
      planName,
    });

    logger.info('[TemplateEngine] Template dispatch prepared', {
      businessId: String(businessId || ''),
      templateName: preparedTemplate.templateName || templateName,
      mappedVariables: preparedTemplate.mappedVariables || {},
      fallbackUsed: !preparedTemplate.ok,
    });

    if (!preparedTemplate.ok) {
      const fallbackMessage = await messageService.sendMessage({
        type: 'TEXT',
        to: phone,
        content: preparedTemplate.fallbackText,
        businessId,
        customer,
        phone,
        senderType,
        planName,
        products,
      });

      return {
        ...fallbackMessage,
        fallbackUsed: true,
        mappedVariables: preparedTemplate.mappedVariables || {},
      };
    }

    const outgoingMessage = await messageService.sendMessage({
      type: 'TEMPLATE',
      to: phone,
      templateName: preparedTemplate.resolvedTemplate.name,
      variables: preparedTemplate.resolvedVariables,
      resolvedTemplate: preparedTemplate.resolvedTemplate,
      renderedContent: preparedTemplate.renderedMessage,
      businessId,
      customer,
      phone,
      senderType,
      planName,
      products,
    });

    return {
      ...outgoingMessage,
      mappedVariables: preparedTemplate.mappedVariables,
      fallbackUsed: false,
    };
  }
}

export default new TemplateEngine();
