import mongoose from 'mongoose';
import logger from '../utils/logger.js';


export const businessContext = async (req, res, next) => {
  try {
    // If businessId is populated, it might be an object. Extract the ID.
    const rawBusinessId = req.user?.businessId?._id || req.user?.businessId;
    const businessIdStr = rawBusinessId ? String(rawBusinessId) : '';

    if (!businessIdStr || !mongoose.Types.ObjectId.isValid(businessIdStr)) {
      logger.warn(`[BusinessContext] Invalid or missing businessId: ${businessIdStr}`);
      return res.status(401).json({ message: 'Unauthorized: Business context missing' });
    }

    req.businessId = new mongoose.Types.ObjectId(businessIdStr);
    next();
  } catch (err) {
    next(err);
  }
};

