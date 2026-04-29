import mongoose from 'mongoose';
import Business from '../models/Business.js';

const getBusinessId = (req) =>
  req.body?.businessId ||
  req.query?.businessId ||
  req.headers['x-business-id'] ||
  req.headers['x-tenant-id'];

export const publicBusinessContext = async (req, res, next) => {
  try {
    const businessId = String(getBusinessId(req) || '').trim();

    if (!businessId) {
      return res.status(400).json({ message: 'businessId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({ message: 'Invalid businessId' });
    }

    req.businessId = new mongoose.Types.ObjectId(businessId);
    next();
  } catch (error) {
    next(error);
  }
};

export const allowPublicBusinessType = (allowedTypes) => {
  const list = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];

  return async (req, res, next) => {
    try {
      const business = await Business.findById(req.businessId).select('businessType').lean();
      if (!business) {
        return res.status(404).json({ message: 'Business not found' });
      }

      if (!list.includes(business.businessType)) {
        return res.status(403).json({ message: 'This feature is not available for your business type' });
      }

      req.businessType = business.businessType;
      next();
    } catch (error) {
      next(error);
    }
  };
};

