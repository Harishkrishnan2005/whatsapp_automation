
// Isolation Test for chatbot matching logic

function findMatchedFlow(flows, currentStep, message) {
    const normalizedMsg = String(message || '').trim().toLowerCase();

    const stepFlows = flows.filter(f => f.step.toLowerCase() === currentStep.toLowerCase());
    const globalFlows = flows.filter(f => f.step === '*');

    // 1. Exact match in current step (exclude '*' keyword here)
    let match = stepFlows.find(flow => {
      const keywords = flow.triggerKeywords || [];
      return keywords.some(k => k.toLowerCase() === normalizedMsg && k !== '*');
    });

    // 2. Exact match in global flows (exclude '*' keyword here)
    if (!match) {
      match = globalFlows.find(flow => {
        const keywords = flow.triggerKeywords || [];
        return keywords.some(k => k.toLowerCase() === normalizedMsg && k !== '*');
      });
    }

    // 3. Wildcard match ONLY in current step
    if (!match) {
      // Find the first flow in the current step that accepts a wildcard '*'
      match = stepFlows.find(flow => (flow.triggerKeywords || []).includes('*'));
    }

    return match;
}

// Mock flows
const mockFlows = [
  { step: 'start', triggerKeywords: ['hi'], responseTemplate: 'Hello (start)' },
  { step: '*', triggerKeywords: ['menu'], responseTemplate: 'Global Menu' },
  { step: 'ask_name', triggerKeywords: ['*'], action: 'SAVE_NAME', responseTemplate: 'Saved name!' },
  { step: '*', triggerKeywords: ['*'], responseTemplate: 'Global Fallback' }
];

console.log("--- Testing Chatbot Matching Fix (Isolated) ---");

// Test 1: Exact match in current step
let match = findMatchedFlow(mockFlows, 'start', 'hi');
console.log("Test 1 (hi @ start):", match?.step === 'start' ? "PASS" : "FAIL", `(Matched: ${match?.step})`);

// Test 2: Global keyword match
match = findMatchedFlow(mockFlows, 'ask_name', 'menu');
console.log("Test 2 (menu @ ask_name):", match?.step === '*' && match?.triggerKeywords.includes('menu') ? "PASS" : "FAIL", `(Matched: ${match?.step}/${match?.triggerKeywords})`);

// Test 3: Wildcard in current step
match = findMatchedFlow(mockFlows, 'ask_name', 'John');
console.log("Test 3 (John @ ask_name):", match?.step === 'ask_name' ? "PASS" : "FAIL", `(Matched: ${match?.step})`);

// Test 4: Global wildcard restriction (Critical Fix)
// Input 'asdf' at step 'start' should NOT match the global '*' step anymore.
match = findMatchedFlow(mockFlows, 'start', 'asdf');
console.log("Test 4 (asdf @ start):", match === undefined ? "PASS" : "FAIL", `(Matched: ${match ? match.step : 'NONE'})`);

console.log("-----------------------------------------------");
