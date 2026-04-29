import User from '../models/User.js';

export default async function ensureStaffEmailUniqueIndex(logger = console) {
  try {
    const indexes = await User.collection.indexes();
    const legacyIndex = indexes.find((idx) => idx.name === 'businessId_1_email_1');
    const globalStaffEmailIndex = indexes.find((idx) => idx.name === 'email_1');

    const duplicateStaffEmails = await User.aggregate([
      { $match: { role: 'staff', email: { $type: 'string' } } },
      { $group: { _id: '$email', count: { $sum: 1 }, businessIds: { $addToSet: '$businessId' } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 10 },
    ]);

    if (duplicateStaffEmails.length > 0) {
      logger.warn('Duplicate staff emails detected. Skipping staff email unique index migration until duplicates are resolved.', {
        duplicates: duplicateStaffEmails.map((entry) => ({
          email: entry._id,
          count: entry.count,
          businessIds: entry.businessIds,
        })),
      });
      return;
    }

    if (legacyIndex) {
      logger.info('Dropping legacy staff email index businessId_1_email_1');
      await User.collection.dropIndex('businessId_1_email_1');
    }

    if (!globalStaffEmailIndex) {
      logger.info('Creating global unique staff email index on users.email');
      await User.collection.createIndex(
        { email: 1 },
        {
          name: 'email_1',
          unique: true,
          partialFilterExpression: {
            role: 'staff',
            email: { $type: 'string' },
          },
        }
      );
    }
  } catch (error) {
    logger.error('Failed to ensure global staff email uniqueness index', { error: error.message });
  }
}
