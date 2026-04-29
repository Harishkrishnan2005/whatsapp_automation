import chatService from './chatService.js';
import messageTemplateService from './messageTemplateService.js';

class MessageService {
  async sendMessage({
    type = 'TEXT',
    to,
    content = '',
    templateName = '',
    variables = {},
    resolvedTemplate = null,
    renderedContent = '',
    businessId,
    customer,
    phone,
    senderType = 'chatbot',
    planName = null,
    products = [],
  }) {
    const normalizedType = String(type || 'TEXT').trim().toUpperCase();
    let finalContent = content;
    let finalTemplate = resolvedTemplate;

    if (normalizedType === 'TEMPLATE') {
      if (!finalTemplate) {
        finalTemplate = await messageTemplateService.findTemplate({
          businessId,
          templateName,
          planName,
          enforceAccess: true,
        });
      }

      if (!finalTemplate) {
        throw new Error(`Template "${templateName}" not found`);
      }

      finalContent = renderedContent || messageTemplateService.renderTemplate(finalTemplate, variables);
    }

    const { message, conversation } = await chatService.saveCustomerTurn({
      businessId,
      customer,
      phone: to || phone || customer?.phone,
      content: finalContent,
      products,
      type: 'outgoing',
      senderType,
      messageType: normalizedType,
      templateName: finalTemplate?.name || null,
      templateVariables: normalizedType === 'TEMPLATE' ? variables : null,
    });

    return {
      text: finalContent,
      response: finalContent,
      type: normalizedType.toLowerCase(),
      messageType: normalizedType,
      templateName: finalTemplate?.name || null,
      variables: normalizedType === 'TEMPLATE' ? variables : null,
      message,
      conversation,
    };
  }
}

export default new MessageService();
