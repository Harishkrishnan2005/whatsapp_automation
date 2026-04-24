import express from 'express';
import TemplateController from '../controllers/templateController.js';
import { authenticateToken, isAdmin } from '../middlewares/authorization.js';
import { businessContext } from '../middlewares/bussinessContext.js';
import validate from '../middlewares/validate.js';

const router = express.Router();

// All routes require authentication and Admin role
router.use(authenticateToken);
router.use(isAdmin);
router.use(businessContext);

/**
 * GET /api/templates
 * Get all available templates for the current business's plan
 */
router.get('/', TemplateController.getAvailableTemplates);

/**
 * GET /api/templates/:templateName
 * Get template details and flow information
 */
router.get('/:templateName', TemplateController.getTemplateDetails);

/**
 * POST /api/templates/:templateName/apply
 * Apply a template to the current business
 * Creates all flows from the template
 */
router.post('/:templateName/apply', TemplateController.applyTemplate);

/**
 * POST /api/templates (Admin only)
 * Create a new template
 */
router.post('/', TemplateController.createTemplate);

export default router;
