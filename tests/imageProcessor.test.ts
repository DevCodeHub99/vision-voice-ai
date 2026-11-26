import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTargetDimensions, MAX_IMAGE_DIMENSION } from '../utils/imageProcessor';

describe('imageProcessor - Dimension Calculations', () => {
    it('should keep dimensions unchanged if both width and height are below maxDimension', () => {
        const result = calculateTargetDimensions(800, 600, MAX_IMAGE_DIMENSION);
        assert.deepEqual(result, { width: 800, height: 600 });
    });

    it('should scale down landscape images preserving aspect ratio', () => {
        const result = calculateTargetDimensions(4000, 3000, 1280);
        assert.equal(result.width, 1280);
        assert.equal(result.height, 960);
    });

    it('should scale down portrait images preserving aspect ratio', () => {
        const result = calculateTargetDimensions(3000, 4000, 1280);
        assert.equal(result.width, 960);
        assert.equal(result.height, 1280);
    });

    it('should scale down high-res square images', () => {
        const result = calculateTargetDimensions(2048, 2048, 1280);
        assert.deepEqual(result, { width: 1280, height: 1280 });
    });

    it('should handle zero or negative dimensions defensively', () => {
        assert.deepEqual(calculateTargetDimensions(0, 0, 1280), { width: 1, height: 1 });
        assert.deepEqual(calculateTargetDimensions(0, 5000, 1280), { width: 1, height: 1 });
    });
});
