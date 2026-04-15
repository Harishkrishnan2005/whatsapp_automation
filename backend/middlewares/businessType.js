import User, { BUSINESS_TYPES } from '../models/User.js';

const FEATURE_NOT_ALLOWED_MESSAGE = 'This feature is not available for your business type';

const normalizeAllowedTypes = (typeOrTypes) => {
  const input = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
  return input.filter((item) => BUSINESS_TYPES.includes(item));
};

const checkBusinessType = (typeOrTypes) => {
  const allowedTypes = normalizeAllowedTypes(typeOrTypes);

  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Access token required' });
      }

      const dbUser = await User.findById(req.user.id).select('businessType');
      if (!dbUser) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user.businessType = dbUser.businessType;

      if (!allowedTypes.length || allowedTypes.includes(dbUser.businessType)) {
        return next();
      }

      return res.status(403).json({
        message: FEATURE_NOT_ALLOWED_MESSAGE,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message || 'Unable to validate business type',
      });
    }
  };
};

export { checkBusinessType, FEATURE_NOT_ALLOWED_MESSAGE };
