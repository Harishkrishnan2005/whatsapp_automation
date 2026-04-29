import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Flow from '../models/Flow.js';
import messageTemplateService from '../services/messageTemplateService.js';
import { resolveFlowTemplateConfig } from '../utils/flowTemplateConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrateFlowTemplates() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI not found in environment');
  }

  await mongoose.connect(mongoUri);
  console.log('[FLOW TEMPLATE MIGRATION] Connected to MongoDB');

  await messageTemplateService.seedDefaultTemplates();

  const flows = await Flow.find({});
  let updatedCount = 0;

  for (const flow of flows) {
    const nextConfig = resolveFlowTemplateConfig({
      trigger: flow.trigger,
      step: flow.step,
      nextStep: flow.nextStep,
      reply: flow.reply,
      action: flow.action,
      responseType: flow.responseType,
      templateName: flow.templateName,
      variableMapping: flow.variableMapping,
    });

    const hasChanged =
      flow.responseType !== nextConfig.responseType ||
      String(flow.templateName || '') !== String(nextConfig.templateName || '') ||
      JSON.stringify(flow.variableMapping || {}) !== JSON.stringify(nextConfig.variableMapping || {});

    if (!hasChanged) {
      continue;
    }

    flow.responseType = nextConfig.responseType;
    flow.templateName = nextConfig.templateName;
    flow.variableMapping = nextConfig.variableMapping;
    await flow.save();
    updatedCount += 1;
  }

  console.log(`[FLOW TEMPLATE MIGRATION] Updated ${updatedCount} flow documents.`);
  await mongoose.disconnect();
}

migrateFlowTemplates()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('[FLOW TEMPLATE MIGRATION] Failed:', error);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
