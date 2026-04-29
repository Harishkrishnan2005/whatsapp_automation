import ChatController from '../chatController.js';

const StaffConversationsController = {
  list(req, res) {
    return ChatController.getAllChats(req, res);
  },
  getMessages(req, res) {
    return ChatController.getMessages(req, res);
  },
  sendMessage(req, res) {
    return ChatController.sendMessage(req, res);
  },
  getById(req, res) {
    return ChatController.getCustomerDetails(req, res);
  }
};

export default StaffConversationsController;
