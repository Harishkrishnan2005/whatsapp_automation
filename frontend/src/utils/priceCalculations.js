/**
 * Price Calculation Utilities for Product Campaigns
 * Handles MRP conversions, discount calculations, and offer price computations
 */

/**
 * Calculate offer price based on MRP and discount percentage
 * @param {number} mrp - Original Maximum Retail Price
 * @param {number} discountPercentage - Discount percentage (0-100)
 * @returns {number} Calculated offer price
 */
export const calculateOfferPrice = (mrp, discountPercentage) => {
  if (!mrp || mrp < 0) return 0;
  if (!discountPercentage) return mrp;
  const discountAmount = mrp * (discountPercentage / 100);
  const offerPrice = mrp - discountAmount;
  return Math.max(0, offerPrice);
};

/**
 * Calculate discount amount in rupees
 * @param {number} mrp - Original Maximum Retail Price
 * @param {number} offerPrice - Discounted price
 * @returns {number} Savings in rupees
 */
export const calculateSavings = (mrp, offerPrice) => {
  if (!mrp || !offerPrice) return 0;
  return Math.max(0, mrp - offerPrice);
};

/**
 * Calculate discount percentage from prices
 * @param {number} mrp - Original Maximum Retail Price
 * @param {number} offerPrice - Discounted price
 * @returns {number} Discount percentage (0-100)
 */
export const calculateDiscountPercentage = (mrp, offerPrice) => {
  if (!mrp || mrp === 0) return 0;
  const discountAmount = mrp - offerPrice;
  return (discountAmount / mrp) * 100;
};

/**
 * Format price for display with currency symbol
 * @param {number} price - Price in decimal form
 * @param {string} currency - Currency symbol (default: ₹)
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency = '₹') => {
  if (!price) return `${currency}0.00`;
  return `${currency}${parseFloat(price).toFixed(2)}`;
};

/**
 * Validate product pricing
 * @param {object} product - Product object with mrp and offerPrice
 * @returns {object} Validation result with isValid flag and errors
 */
export const validateProductPricing = (product) => {
  const errors = [];

  if (!product.mrp || product.mrp <= 0) {
    errors.push('MRP must be greater than 0');
  }

  if (product.offerPrice !== undefined && product.offerPrice < 0) {
    errors.push('Offer price cannot be negative');
  }

  if (product.offerPrice > product.mrp) {
    errors.push('Offer price cannot be greater than MRP');
  }

  if (product.offerPercentage !== undefined) {
    if (product.offerPercentage < 0 || product.offerPercentage > 100) {
      errors.push('Discount percentage must be between 0 and 100');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  calculateOfferPrice,
  calculateSavings,
  calculateDiscountPercentage,
  formatPrice,
  validateProductPricing,
};
