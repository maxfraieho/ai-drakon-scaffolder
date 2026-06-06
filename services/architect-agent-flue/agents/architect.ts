import { createAgent } from '@flue/runtime';
import { ARCHITECT_SYSTEM_PROMPT } from '../lib/prompts.js';

export default createAgent(() => ({
  model: 'custom/gemini-2.5-flash',
  instructions: ARCHITECT_SYSTEM_PROMPT,
  tools: [],
}));
