import ChatbotFlow from '../models/ChatbotFlow.js';
import logger from '../utils/logger.js';

class FlowEngine {
  /**
   * Find the matching flow for the current input and step
   */
  async findMatch(businessId, currentStep, message) {
    const normalizedMsg = String(message || '').trim().toLowerCase();
    
    // Find all potential flows for this business
    const flows = await ChatbotFlow.find({
      businessId,
      isActive: true,
      $or: [
        { step: currentStep },
        { step: '*' },
        { step: 'system', isSystem: true }
      ]
    }).lean();

    // 1. Exact match in current step
    let matched = flows.find(f => 
      f.step === currentStep && 
      (f.triggerKeywords || []).map(k => k.toLowerCase()).includes(normalizedMsg)
    );

    // 2. Global match (*)
    if (!matched) {
      matched = flows.find(f => 
        f.step === '*' && 
        (f.triggerKeywords || []).map(k => k.toLowerCase()).includes(normalizedMsg)
      );
    }

    // 3. Wildcard catch-all in current step
    if (!matched) {
      matched = flows.find(f => 
        f.step === currentStep && 
        (f.triggerKeywords || []).includes('*')
      );
    }

    // 4. Fallback to System
    if (!matched) {
      matched = flows.find(f => f.step === 'system' && f.isSystem);
    }

    return matched;
  }

  /**
   * Determine the type of node we are on
   */
  getNodeType(flow) {
    if (flow.action && flow.action !== 'NONE') return 'ACTION';
    if (flow.triggerKeywords && flow.triggerKeywords.includes('*')) return 'INPUT';
    return 'MESSAGE';
  }
}

export default new FlowEngine();
