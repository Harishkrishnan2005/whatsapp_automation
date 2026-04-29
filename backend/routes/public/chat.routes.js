import express from 'express';
import PublicChatController from '../../controllers/public/chat.controller.js';
import { publicBusinessContext } from '../../middlewares/publicBusinessContext.js';

const router = express.Router();

router.use(publicBusinessContext);
router.post('/start', PublicChatController.start);
router.post('/message', PublicChatController.message);
router.get('/history', PublicChatController.getHistory);
router.get('/session/:id', PublicChatController.getSession);

export default router;
