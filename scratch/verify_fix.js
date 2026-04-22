
import mongoose from 'mongoose';
import ChatbotEngine from './backend/services/chatbotEngine.js';

// Mock flows
const mockFlows = [
  { step: 'start', triggerKeywords: ['hi'], responseTemplate: 'Hello (start)' },
  { step: '*', triggerKeywords: ['menu'], responseTemplate: 'Global Menu' },
  { step: 'ask_name', triggerKeywords: ['*'], action: 'SAVE_NAME', responseTemplate: 'Saved name!' },
  { step: '*', triggerKeywords: ['*'], responseTemplate: 'Global Fallback' }
];

console.log("--- Testing Chatbot Matching Fix ---");

// Test 1: Exact match in current step
let match = ChatbotEngine.findMatchedFlow(mockFlows, 'start', 'hi');
console.log("Test 1 (hi @ start):", match?.step === 'start' ? "PASS" : "FAIL", `(Matched: ${match?.step})`);

// Test 2: Global keyword match
match = ChatbotEngine.findMatchedFlow(mockFlows, 'ask_name', 'menu');
console.log("Test 2 (menu @ ask_name):", match?.step === '*' && match?.triggerKeywords.includes('menu') ? "PASS" : "FAIL", `(Matched: ${match?.step}/${match?.triggerKeywords})`);

// Test 3: Wildcard in current step
match = ChatbotEngine.findMatchedFlow(mockFlows, 'ask_name', 'John');
console.log("Test 3 (John @ ask_name):", match?.step === 'ask_name' ? "PASS" : "FAIL", `(Matched: ${match?.step})`);

// Test 4: Global wildcard restriction (Critical Fix)
// Input 'asdf' at step 'start' should NOT match the global '*' step.
match = ChatbotEngine.findMatchedFlow(mockFlows, 'start', 'asdf');
console.log("Test 4 (asdf @ start):", match === undefined ? "PASS" : "FAIL", `(Matched: ${match ? match.step : 'NONE'})`);

console.log("-----------------------------------");
