import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    OPENROUTER_PRESET_MODELS,
    GEMINI_PRESET_MODELS,
    GROQ_PRESET_MODELS,
    RAPIDROUTER_PRESET_MODELS,
    DEFAULT_OPENROUTER_CASCADE,
    DEFAULT_GEMINI_CASCADE,
    DEFAULT_GROQ_CASCADE,
    DEFAULT_RAPIDROUTER_CASCADE,
    PROVIDER_ORDER,
    PROVIDER_PRESET_MODELS,
    PROVIDER_DEFAULT_MODELS,
    PROMPT_TEMPLATES,
    AI_SYSTEM_INSTRUCTION
} from '../constants';
import { Task } from '../types';

describe('Model Presets & Constants Integrity', () => {
    it('should configure openrouter/free as the primary recommendation in OpenRouter cascade', () => {
        assert.equal(DEFAULT_OPENROUTER_CASCADE[0], 'openrouter/free');
    });

    it('should ensure all non-custom OpenRouter models are 100% free tier (:free or openrouter/free)', () => {
        const nonCustomModels = OPENROUTER_PRESET_MODELS.filter(m => m.id !== 'custom');
        for (const model of nonCustomModels) {
            const isZeroCost = model.id === 'openrouter/free' || model.id.endsWith(':free');
            assert.equal(isZeroCost, true, `Model ${model.id} is not marked as free! All preset models must be zero-cost.`);
        }
    });

    it('should ensure all non-custom Rapid Router models are zero-cost (:free)', () => {
        const nonCustomModels = RAPIDROUTER_PRESET_MODELS.filter(m => m.id !== 'custom');
        assert.ok(nonCustomModels.length >= 2);
        for (const model of nonCustomModels) {
            assert.equal(model.id.endsWith(':free'), true);
        }
    });

    it('should have unique IDs across all providers and include custom model support', () => {
        assert.deepEqual(PROVIDER_ORDER, ['gemini', 'openrouter', 'groq', 'rapidrouter']);
        for (const provider of PROVIDER_ORDER) {
            const presets = PROVIDER_PRESET_MODELS[provider];
            const ids = presets.map(m => m.id);
            assert.equal(new Set(ids).size, ids.length);
            assert.ok(ids.includes('custom'));
            assert.ok(ids.filter(id => id !== 'custom').length >= 2);
            assert.equal(PROVIDER_DEFAULT_MODELS[provider], presets[0].id);
        }
        assert.ok(GEMINI_PRESET_MODELS.length >= 3);
        assert.ok(GROQ_PRESET_MODELS.length >= 3);
        assert.equal(DEFAULT_GEMINI_CASCADE[0], 'gemini-3.8-flash');
        assert.equal(DEFAULT_GROQ_CASCADE[0], 'qwen/qwen3.8-27b');
        assert.equal(DEFAULT_RAPIDROUTER_CASCADE[0], 'google/gemma-4-31b-it:free');
    });

    it('should include high-speed active model inclusionai/ling-3.2-flash:free', () => {
        const fastModel = OPENROUTER_PRESET_MODELS.find(m => m.id === 'inclusionai/ling-3.2-flash:free');
        assert.ok(fastModel);
        assert.equal(fastModel.badge, 'Fast');
    });

    it('should include high-resolution Google Gemma model google/gemma-4-31b-it:free', () => {
        const gemmaVision = OPENROUTER_PRESET_MODELS.find(m => m.id === 'google/gemma-4-31b-it:free');
        assert.ok(gemmaVision);
        assert.equal(gemmaVision.badge, 'High Res');
    });

    it('should configure concise non-filler prompt templates for visual impairment assistance', () => {
        assert.ok(PROMPT_TEMPLATES[Task.DESCRIBE].includes('visually impaired person'));
        assert.ok(PROMPT_TEMPLATES[Task.DESCRIBE].includes('concise'));
        assert.ok(PROMPT_TEMPLATES[Task.READ].includes('Extract all visible text'));
        assert.ok(AI_SYSTEM_INSTRUCTION.includes('visual aid assistant'));
    });
});
