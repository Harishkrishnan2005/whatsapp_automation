import ChatbotFlow from '../models/ChatbotFlow.js';
import logger from '../utils/logger.js';

class FlowEngine {
  RESTART_KEYWORDS = new Set(['hi', 'hello', 'start', 'menu']);

  async getStepFlows(businessId, currentStep) {
    return ChatbotFlow.find({
      businessId,
      isActive: true,
      step: currentStep,
    }).lean();
  }

  /**
   * Find the matching flow for the current input and step
   */
  async findMatch(businessId, currentStep, message) {
    const normalizedMsg = String(message || '').trim().toLowerCase();
    const flows = await this.getStepFlows(businessId, currentStep);

    // 1. Exact match in current step
    let matched = flows.find(f => 
      f.step === currentStep && 
      (f.triggerKeywords || []).map(k => k.toLowerCase()).includes(normalizedMsg)
    );

    // 2. Wildcard catch-all in current step
    if (!matched) {
      matched = flows.find(f => 
        f.step === currentStep && 
        (f.triggerKeywords || []).includes('*')
      );
    }

    // 3. Global restart shortcuts should always re-enter the start flow.
    if (!matched && currentStep !== 'start' && this.RESTART_KEYWORDS.has(normalizedMsg)) {
      const startFlows = await this.getStepFlows(businessId, 'start');

      matched = startFlows.find(f =>
        (f.triggerKeywords || []).map(k => k.toLowerCase()).includes(normalizedMsg)
      );

      if (!matched) {
        matched = startFlows.find(f => (f.triggerKeywords || []).includes('*'));
      }
    }

    return matched;
  }

  async getStepConfig(businessId, currentStep) {
    const flows = await this.getStepFlows(businessId, currentStep);
    return (
      flows.find((flow) => flow.step === currentStep && (flow.triggerKeywords || []).includes('*')) ||
      flows.find((flow) => flow.step === currentStep) ||
      null
    );
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
