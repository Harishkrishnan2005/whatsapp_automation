import Product from '../models/Product.js';

class ChatbotService {
  buildMainMenu(name) {
    return `Welcome, ${name}!\n\n1. View Products\n2. Place Order\n3. Book Appointment\n4. Support\n\nReply with the number or type a command to continue.`;
  }

  async processMessage(customer, message) {
    const trimmedMessage = message.trim();
    const lowerMessage = trimmedMessage.toLowerCase();
    const activeProducts = await Product.find({ isActive: true }).sort({ name: 1 });

    if (customer.chatState === 'ASK_NAME' || (!customer.name && !customer.age)) {
      if (lowerMessage === 'hi' || lowerMessage === 'hello') {
        return {
          response: 'Welcome! Please share your name.',
          customerUpdate: false,
        };
      }

      if (!trimmedMessage) {
        return {
          response: 'I did not catch your name. Please tell me your name to continue.',
          customerUpdate: false,
        };
      }

      return {
        response: `Thanks, ${trimmedMessage}. Please share your age.`,
        customerUpdate: true,
        customerFields: {
          name: trimmedMessage,
          status: 'new',
          chatState: 'ASK_AGE',
          sessionData: { pendingName: trimmedMessage },
        },
      };
    }

    if (customer.chatState === 'ASK_AGE' || !customer.age) {
      const parsedAge = parseInt(trimmedMessage, 10);
      if (Number.isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        return {
          response: 'Please enter a valid age (1-120).',
          customerUpdate: false,
        };
      }

      const resolvedName = customer.sessionData?.pendingName || customer.name || 'Customer';
      return {
        response: this.buildMainMenu(resolvedName),
        customerUpdate: true,
        customerFields: {
          name: resolvedName,
          age: parsedAge,
          status: 'new',
          chatState: 'MAIN_MENU',
          sessionData: {},
        },
      };
    }

    if (lowerMessage === 'hi' || lowerMessage === 'hello') {
      return {
        response: this.buildMainMenu(customer.name),
        customerUpdate: true,
        customerFields: {
          chatState: 'MAIN_MENU',
          sessionData: {},
        },
      };
    }

    if (lowerMessage === '1' || lowerMessage.includes('view products')) {
      if (!activeProducts.length) {
        return { response: 'No active products are available right now. Please check back later.', customerUpdate: false };
      }

      return {
        response: 'Here are our available products:',
        products: activeProducts.map(product => ({
          id: product._id,
          name: product.name,
          mrp: product.mrp,
          offerPercentage: product.offerPercentage,
          price: product.offerPrice,
          category: product.category,
          image: product.image,
          redirectUrl: product.redirectUrl
        })),
        customerUpdate: true,
        customerFields: {
          chatState: 'VIEW_PRODUCTS',
          sessionData: {},
        },
      };
    }

    if (lowerMessage === '2' || lowerMessage.includes('place order')) {
      if (!activeProducts.length) {
        return { response: 'Products are currently unavailable. Please try again later.', customerUpdate: false };
      }

      return {
        response: 'Please choose a product to order:',
        products: activeProducts.map(product => ({
          id: product._id,
          name: product.name,
          mrp: product.mrp,
          offerPercentage: product.offerPercentage,
          price: product.offerPrice,
          category: product.category,
          image: product.image,
          redirectUrl: product.redirectUrl
        })),
        customerUpdate: true,
        customerFields: {
          chatState: 'AWAITING_ORDER',
          sessionData: {},
        },
      };
    }

    if (lowerMessage === '3' || lowerMessage.includes('book appointment')) {
      return {
        response: 'Sure! Let\'s book an appointment.\n\nAvailable time slots:\n1. 5PM\n2. 6PM\n\nReply with the number of your preferred time slot.',
        customerUpdate: true,
        customerFields: {
          chatState: 'SELECT_TIME_SLOT',
          sessionData: {},
        },
      };
    }

    if (lowerMessage === '4' || lowerMessage.includes('support')) {
      return {
        response: 'Our support team is here to help. Please tell us your issue or type "support" to continue.',
        customerUpdate: true,
        customerFields: {
          chatState: 'SUPPORT',
          sessionData: {},
        },
      };
    }

    if (customer.chatState === 'AWAITING_PAYMENT') {
      const selectedProductName = customer.sessionData?.selectedProduct;
      const selectedProduct = activeProducts.find(
        (product) => product.name.toLowerCase() === String(selectedProductName || '').toLowerCase()
      );

      if (!selectedProduct) {
        return {
          response: 'The selected product is no longer available. Please choose another product.',
          customerUpdate: true,
          customerFields: {
            chatState: 'AWAITING_ORDER',
            sessionData: {},
          },
        };
      }

      let paymentMethod = null;
      if (['upi', 'online', 'online upi', '1'].includes(lowerMessage)) {
        paymentMethod = 'UPI';
      }
      if (['cash', '2'].includes(lowerMessage)) {
        paymentMethod = 'Cash';
      }

      if (!paymentMethod) {
        return {
          response: 'Please choose a payment method: UPI or Cash.',
          customerUpdate: false,
        };
      }

      return {
        response: `Order placed for ${selectedProduct.name} with ${paymentMethod} payment. We will confirm shortly.`,
        customerUpdate: true,
        customerFields: {
          chatState: 'MAIN_MENU',
          sessionData: {},
        },
        orderProduct: selectedProduct,
        paymentMethod,
      };
    }

    const productName = lowerMessage.startsWith('order ')
      ? trimmedMessage.substring(6).trim()
      : trimmedMessage;

    const matchedProduct = activeProducts.find((product) =>
      product.name.toLowerCase() === productName.toLowerCase()
    );

    if (matchedProduct) {
      if (lowerMessage.startsWith('order ') || customer.chatState === 'AWAITING_ORDER' || customer.chatState === 'VIEW_PRODUCTS') {
        return {
          response: `You selected ${matchedProduct.name} (Rs ${matchedProduct.offerPrice}).\nChoose payment method:\n1. UPI\n2. Cash\n\nReply with UPI or Cash.`,
          customerUpdate: true,
          customerFields: {
            chatState: 'AWAITING_PAYMENT',
            sessionData: { selectedProduct: matchedProduct.name },
          },
        };
      }

      return {
        response: `${matchedProduct.name}\nPrice: Rs ${matchedProduct.price}\nCategory: ${matchedProduct.category}\nBuy here: ${matchedProduct.redirectUrl}\n\nReply with the product name to continue.`,
        customerUpdate: true,
        customerFields: {
          chatState: 'AWAITING_ORDER',
          sessionData: { selectedProduct: matchedProduct.name },
        },
      };
    }

    if (lowerMessage.startsWith('order ') && !matchedProduct) {
      return {
        response: 'I could not find that product. Please check the name and try again or type 1 to view available products.',
        customerUpdate: false,
      };
    }

    if (customer.chatState === 'SELECT_TIME_SLOT') {
      let timeSlot = null;
      if (lowerMessage === '1' || lowerMessage.includes('5pm')) {
        timeSlot = '5PM';
      } else if (lowerMessage === '2' || lowerMessage.includes('6pm')) {
        timeSlot = '6PM';
      }

      if (!timeSlot) {
        return {
          response: 'Please select a valid time slot:\n1. 5PM\n2. 6PM',
          customerUpdate: false,
        };
      }

      // Create appointment for tomorrow by default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        response: `Great! Your appointment is booked for ${tomorrow.toLocaleDateString()} at ${timeSlot}. Our team will confirm shortly.`,
        customerUpdate: true,
        customerFields: {
          chatState: 'MAIN_MENU',
          sessionData: {},
        },
        bookAppointment: {
          date: tomorrow,
          timeSlot: timeSlot,
        },
      };
    }

    if (customer.chatState === 'BOOK_APPOINTMENT') {
      return {
        response: `Thanks ${customer.name}! Your appointment request has been received. Our team will follow up soon.`,
        customerUpdate: true,
        customerFields: {
          chatState: 'MAIN_MENU',
          sessionData: {},
        },
      };
    }

    if (customer.chatState === 'SUPPORT') {
      return {
        response: 'Thanks for reaching out to support. We will review your message and get back to you shortly.',
        customerUpdate: true,
        customerFields: {
          chatState: 'MAIN_MENU',
          sessionData: {},
        },
      };
    }

    return {
      response: 'Sorry, I did not understand that. Reply with "Hi" to see the main menu again.',
      customerUpdate: false,
    };
  }
}

export default new ChatbotService();
