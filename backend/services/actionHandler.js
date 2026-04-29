import Product from '../models/Product.js';
import customerService from './customerService.js';
import chatbotActions from './chatbotActions.js';
import logger from '../utils/logger.js';

class ActionHandler {
  setSessionValue(session, key, value) {
    session.context = session.context || {};
    session.context[key] = value;
    session.markModified('context');
  }

  async persistSessionAndCustomerField(session, customer, key, value) {
    this.setSessionValue(session, key, value);
    if (customer?.schema?.path(key)) {
      await customerService.saveCustomerField(customer, key, value);
    }
    return { success: true };
  }

  async executeAction(action, { userInput, session, businessId, customer }) {
    logger.info(`[ActionHandler] Executing action: ${action} for business: ${businessId}`);

    switch (action) {
      case 'SAVE_NAME': {
        const name = String(userInput || '').trim();
        if (!name) {
          return { success: false, reply: 'Please enter a valid name.' };
        }
        return this.persistSessionAndCustomerField(session, customer, 'name', name);
      }

      case 'SAVE_AGE': {
        const age = Number.parseInt(String(userInput || '').trim(), 10);
        if (!Number.isInteger(age) || age < 1 || age > 120) {
          return { success: false, reply: 'Please enter a valid age between 1 and 120.' };
        }
        return this.persistSessionAndCustomerField(session, customer, 'age', age);
      }

      case 'SAVE_ADDRESS': {
        const address = typeof userInput === 'object'
          ? JSON.stringify(userInput)
          : String(userInput || '').trim();
        if (!address) {
          return { success: false, reply: 'Please enter a valid address.' };
        }
        return this.persistSessionAndCustomerField(session, customer, 'address', address);
      }

      case 'SAVE_PHONE': {
        const phone = String(userInput || '').trim();
        if (!phone) {
          return { success: false, reply: 'Please enter a valid phone number.' };
        }
        this.setSessionValue(session, 'phone', phone);
        if (customer) {
          await customerService.touchCustomer(customer, { phone });
        }
        return { success: true };
      }

      case 'SHOW_PRODUCTS': {
        const products = await Product.find({ businessId }).limit(10).lean();
        this.setSessionValue(
          session,
          'lastShownProducts',
          products.map((product, index) => ({
            index: index + 1,
            id: String(product._id),
            name: product.name,
          }))
        );
        this.setSessionValue(
          session,
          'products',
          products.map((product) => ({
            id: String(product._id),
            name: product.name,
            price: product.price,
          }))
        );
        return {
          success: true,
          reply: `Here are our products:\n${products.map((product, index) => `${index + 1}. ${product.name} - ₹${product.price}`).join('\n')}`,
          data: { products },
        };
      }

      case 'SHOW_SERVICES': {
        const services = [
          { name: 'Haircut', price: 500 },
          { name: 'Massage', price: 1000 },
        ];
        return {
          success: true,
          reply: `Select a service:\n${services.map((service, index) => `${index + 1}. ${service.name} - ₹${service.price}`).join('\n')}`,
          data: { services },
        };
      }

      case 'NONE':
      default:
        if (typeof chatbotActions[action] === 'function') {
          const result = await chatbotActions[action]({
            message: userInput,
            userInput,
            session,
            businessId,
            customer,
          });

          const normalizedData = {
            ...(result?.data || {}),
          };

          if (action === 'REQUEST_REFUND') {
            normalizedData.orderId = normalizedData.orderId || String(userInput || '').trim();
            normalizedData.returnStatus = normalizedData.returnStatus || 'REQUESTED';
          }

          if (action === 'CREATE_SUPPORT') {
            const ticketMatch = String(result?.text || '').match(/Ticket ID:\s*([A-Za-z0-9]+)/i);
            if (ticketMatch?.[1]) {
              normalizedData.ticketId = normalizedData.ticketId || ticketMatch[1];
            }
          }

          if (action === 'BOOK_APPOINTMENT') {
            normalizedData.date = normalizedData.date || session?.context?.date || session?.collectedData?.date;
            normalizedData.type = normalizedData.type || 'appointment';
          }

          if (session && Object.keys(normalizedData).length > 0) {
            session.context = session.context || {};
            Object.assign(session.context, normalizedData);
            session.markModified('context');
          }

          return {
            success: result?.success !== false,
            ...result,
            data: normalizedData,
            reply: result?.reply || result?.text || '',
          };
        }

        return { success: true };
    }
  }
}

export default new ActionHandler();
