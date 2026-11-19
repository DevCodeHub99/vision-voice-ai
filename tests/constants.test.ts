import { describe, it, expect } from 'vitest';
import {
    OPENROUTER_PRESET_MODELS,
    GEMINI_PRESET_MODELS,
    DEFAULT_OPENROUTER_CASCADE,
    DEFAULT_GEMINI_CASCADE,
    PROMPT_TEMPLATES,
    AI_SYSTEM_INSTRUCTION
} from '../constants';
import { Task } from '../types';

describe('Model Presets & Constants Integrity', () => {
    it('should configure openrouter/free as the primary recommendation in OpenRouter cascade', () => {
        expect(DEFAULT_OPENROUTER_CASCADE[0]).toBe('openrouter/free');
    });

    it('should ensure all non-custom OpenRouter models are 100% free tier (:free or openrouter/free)', () => {
        const nonCustomModels = OPENROUTER_PRESET_MODELS.filter(m => m.id !== 'custom');
        for (const model of nonCustomModels) {
            const isZeroCost = model.id === 'openrouter/free' || model.id.endsWith(':free');
            expect(isZeroCost, `Model ${model.id} is not marked as free! All preset models must be zero-cost.`).toBe(true);
        }
    });

    it('should have unique IDs across all OpenRouter presets', () => {
        const ids = OPENROUTER_PRESET_MODELS.map(m => m.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique IDs across all Gemini presets', () => {
        const ids = GEMINI_PRESET_MODELS.map(m => m.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include specialized OCR model qwen/qwen2.5-vl-7b-instruct:free', () => {
        const ocrModel = OPENROUTER_PRESET_MODELS.find(m => m.id === 'qwen/qwen2.5-vl-7b-instruct:free');
        expect(ocrModel).toBeDefined();
        expect(ocrModel?.badge).toBe('Top OCR');
    });

    it('should include lightweight edge vision model meta-llama/llama-3.2-11b-vision-instruct:free', () => {
        const llamaVision = OPENROUTER_PRESET_MODELS.find(m => m.id === 'meta-llama/llama-3.2-11b-vision-instruct:free');
        expect(llamaVision).toBeDefined();
        expect(llamaVision?.badge).toBe('Fast');
    });

    it('should configure concise non-filler prompt templates for visual impairment assistance', () => {
        expect(PROMPT_TEMPLATES[Task.DESCRIBE]).toContain('visually impaired person');
        expect(PROMPT_TEMPLATES[Task.DESCRIBE]).toContain('concise');
        expect(PROMPT_TEMPLATES[Task.READ]).toContain('Extract all visible text');
        expect(AI_SYSTEM_INSTRUCTION).toContain('visual aid assistant');
    });
});
