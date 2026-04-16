import mongoose from 'mongoose';

export const businessContext = async (req, res, next) => {
  try {
    const businessId = req.user?.businessId ? String(req.user.businessId) : '';
    if (!businessId || !mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.businessId = new mongoose.Types.ObjectId(businessId);
    console.log('Tenant:', String(req.businessId));
    next();
  } catch (err) {
    next(err);
  }
};
