import ChatbotFlow from '../models/ChatbotFlow.js';
import Notification from '../models/Notification.js';

class ChatbotService {
  // Process message based on chatbot flows
  async processMessageWithFlow(message) {
    const lowerMessage = message.toLowerCase();

    // Default behavior if no flows are enabled
    if (lowerMessage === 'hi' || lowerMessage === 'hello') {
      return `Welcome! Please choose an option:\n1. View Products\n2. Place Order\n3. Book Appointment\n\nReply with the number.`;
    }

    if (lowerMessage === '1') {
      return 'Our products: 1. Product A - $10, 2. Product B - $20, 3. Product C - $30. Reply with product name to order.';
    }

    if (lowerMessage === '2') {
      return 'To place an order, reply with: order <product_name>';
    }

    if (lowerMessage === '3') {
      return 'To book an appointment, reply with: book <date> (e.g., book 2023-12-01)';
    }

    if (lowerMessage.startsWith('order ')) {
      const product = message.substring(6);
      return `Order placed for ${product}. We will confirm shortly.`;
    }

    if (lowerMessage.startsWith('book ')) {
      const date = message.substring(5);
      return `Appointment booked for ${date}. We will send confirmation.`;
    }

    return 'Sorry, I did not understand. Please reply with "Hi" to see options.';
  }

  // Create chatbot flow
  async createFlow(name, trigger, responses) {
    return await ChatbotFlow.create({ name, trigger, responses });
  }

  // Get all flows
  async getFlows() {
    return await ChatbotFlow.find();
  }

  // Update flow
  async updateFlow(flowId, data) {
    return await ChatbotFlow.findByIdAndUpdate(flowId, data, { new: true });
  }

  // Delete flow
  async deleteFlow(flowId) {
    return await ChatbotFlow.findByIdAndDelete(flowId);
  }

  // Toggle bot status
  async toggleBotStatus(flowId, isActive) {
    return await ChatbotFlow.findByIdAndUpdate(flowId, { isActive }, { new: true });
  }

  // Notify staff of message
  async notifyStaffOfMessage(customerId, message, staffUsers) {
    for (const staff of staffUsers) {
      await Notification.create({
        userId: staff._id,
        type: 'new_message',
        message: `New message from customer ${customerId}`,
        relatedId: customerId,
      });
    }
  }
}

export default new ChatbotService();