import { v2 as cloudinary } from 'cloudinary';
import Business from '../models/Business.js';

class CloudinaryService {
  /**
   * Configure cloudinary for a specific business
   */
  async configureForBusiness(businessId) {
    const business = await Business.findById(businessId).select('cloudinaryConfig').lean();
    const config = business?.cloudinaryConfig || {};

    cloudinary.config({
      cloud_name: config.cloudName || process.env.CLOUDINARY_CLOUD_NAME,
      api_key: config.apiKey || process.env.CLOUDINARY_API_KEY,
      api_secret: config.apiSecret || process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload an image to Cloudinary
   * @param {string} businessId
   * @param {string} filePath - Path to local file or data URI
   * @param {string} folder - Optional folder name
   */
  async uploadImage(businessId, filePath, folder = 'product_images') {
    try {
      await this.configureForBusiness(businessId);
      
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `${businessId}/${folder}`,
        use_filename: true,
        unique_filename: true,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      console.error('[CloudinaryService] uploadImage error:', error);
      throw error;
    }
  }

  /**
   * Delete an image from Cloudinary
   */
  async deleteImage(businessId, publicId) {
    try {
      await this.configureForBusiness(businessId);
      await cloudinary.uploader.destroy(publicId);
      return { success: true };
    } catch (error) {
      console.error('[CloudinaryService] deleteImage error:', error);
      throw error;
    }
  }
}

export default new CloudinaryService();
