import Campaign from '../models/Campaign.js';
import Customer from '../models/Customer.js';
import Message from '../models/Message.js';
import Product from '../models/Product.js';
import WhatsAppService from './WhatsAppService.js';
import buildTenantScope from '../utils/tenantScope.js';

class CampaignService {
  /**
   * Create and execute a campaign
   */
  async createCampaign(businessId, { message, audience, type, productIds, templateName, scheduledAt }) {
    const tenantScope = buildTenantScope(businessId);
    
    // 1. Resolve Audience
    let query = { ...tenantScope };
    if (audience === 'existing') query.status = 'existing';
    if (audience === 'new') query.status = 'new';
    
    const customers = await Customer.find(query).select('_id phone name').lean();
    if (customers.length === 0) throw new Error('No customers found for the selected audience.');

    // 2. Create Campaign Record
    const campaign = await Campaign.create({
      businessId,
      message,
      type: type || 'TEXT',
      audience,
      templateName,
      totalCustomers: customers.length,
      scheduledAt: scheduledAt || new Date(),
      status: scheduledAt ? 'scheduled' : 'pending'
    });

    // 3. Immediate execution if not scheduled for future
    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      this.executeCampaign(campaign._id, businessId, customers);
    }

    return campaign;
  }

  /**
   * Background execution of campaign
   */
  async executeCampaign(campaignId, businessId, customers) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return;

      campaign.status = 'processing';
      await campaign.save();

      let successCount = 0;
      let failCount = 0;

      for (const customer of customers) {
        try {
          if (campaign.type === 'TEMPLATE') {
            await WhatsAppService.sendTemplateMessage(businessId, customer.phone, campaign.templateName);
          } else {
            // Text or Product (simplified text for product for now)
            await WhatsAppService.sendTextMessage(businessId, customer.phone, campaign.message);
          }

          // Log in Messages collection
          await Message.create({
            businessId,
            customerId: customer._id,
            message: campaign.message,
            type: 'outgoing',
            senderType: 'admin',
            campaignId: campaign._id
          });

          successCount++;
        } catch (err) {
          console.error(`[Campaign] Failed for ${customer.phone}:`, err.message);
          failCount++;
        }

        // Update counts periodically
        if (successCount % 10 === 0) {
          await Campaign.updateOne({ _id: campaignId }, { $set: { sentCount: successCount } });
        }
      }

      campaign.status = 'completed';
      campaign.sentCount = successCount;
      campaign.deliveryStats = { ...campaign.deliveryStats, failed: failCount, delivered: successCount };
      campaign.sentAt = new Date();
      await campaign.save();

    } catch (error) {
      console.error('[Campaign] Execution error:', error);
      await Campaign.updateOne({ _id: campaignId }, { $set: { status: 'failed' } });
    }
  }

  async getCampaigns(businessId) {
    return await Campaign.find({ businessId }).sort({ createdAt: -1 }).lean();
  }

  async getCampaignAnalytics(businessId, campaignId) {
    const campaign = await Campaign.findOne({ _id: campaignId, businessId }).lean();
    if (!campaign) throw new Error('Campaign not found');
    return campaign;
  }
}

export default new CampaignService();

