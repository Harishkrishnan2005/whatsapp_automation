import { z } from 'zod';
import logger from '../utils/logger.js';

/**
 * Middleware to validate request against Zod schema
 * @param {Object} schemas - Object containing zod schemas for body, query, or params
 */
const validate = (schemas) => {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors || error.issues || [];
        logger.warn('Validation error:', validationErrors);
        return res.status(400).json({
          message: 'Validation failed',
          errors: validationErrors.map(err => ({
            path: Array.isArray(err.path) ? err.path.join('.') : (err.path || ''),
            message: err.message
          }))
        });
      }
      return res.status(500).json({ message: 'Internal server error during validation' });
    }
  };
};

export default validate;
