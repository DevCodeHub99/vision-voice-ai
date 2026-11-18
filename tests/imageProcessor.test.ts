import { describe, it, expect } from 'vitest';
import { calculateTargetDimensions, MAX_IMAGE_DIMENSION } from '../utils/imageProcessor';

describe('imageProcessor - Dimension Calculations', () => {
    it('should keep dimensions unchanged if both width and height are below maxDimension', () => {
        const result = calculateTargetDimensions(800, 600, MAX_IMAGE_DIMENSION);
        expect(result).toEqual({ width: 800, height: 600 });
    });

    it('should scale down landscape images preserving aspect ratio', () => {
        // 4000x3000 (4:3 ratio) -> 1280x960
        const result = calculateTargetDimensions(4000, 3000, 1280);
        expect(result.width).toBe(1280);
        expect(result.height).toBe(960);
    });

    it('should scale down portrait images preserving aspect ratio', () => {
        // 3000x4000 (3:4 ratio) -> 960x1280
        const result = calculateTargetDimensions(3000, 4000, 1280);
        expect(result.width).toBe(960);
        expect(result.height).toBe(1280);
    });

    it('should scale down high-res square images', () => {
        // 2048x2048 -> 1280x1280
        const result = calculateTargetDimensions(2048, 2048, 1280);
        expect(result).toEqual({ width: 1280, height: 1280 });
    });

    it('should handle zero or negative dimensions defensively', () => {
        const result = calculateTargetDimensions(0, 0, 1280);
        expect(result.width).toBeGreaterThan(0);
        expect(result.height).toBeGreaterThan(0);
    });
});
