import express from 'express';
import messageTemplateController from '../controllers/messageTemplateController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';

const router = express.Router();

router.use(authenticateToken);
router.use(isAdmin);
router.use(businessContext);

router.get('/', messageTemplateController.listTemplates);
router.post('/', messageTemplateController.createTemplate);
router.patch('/:id/status', messageTemplateController.updateTemplateStatus);

export default router;
