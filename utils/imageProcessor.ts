/**
 * Client-Side Image Processing & Pre-Compression Pipeline.
 * 
 * Automatically downsizes high-resolution camera frames and gallery uploads
 * (e.g. 12MP/48MP smartphone photos) down to a balanced dimension (default: 1280px)
 * and compresses them to JPEG 0.8 before transmitting over the network.
 * 
 * Reduces base64 payload size by up to 90%, cutting mobile latency and avoiding
 * upstream AI API payload rejections (413 Payload Too Large).
 */

export interface ProcessedImage {
    dataUrl: string;
    base64Data: string;
    mimeType: string;
    width: number;
    height: number;
}

export const MAX_IMAGE_DIMENSION = 1280;
export const COMPRESSION_QUALITY = 0.8;

/**
 * Calculates resized dimensions preserving aspect ratio.
 */
export const calculateTargetDimensions = (
    width: number,
    height: number,
    maxDimension: number = MAX_IMAGE_DIMENSION
): { width: number; height: number } => {
    if (width <= 0 || height <= 0) {
        return { width: Math.max(1, width), height: Math.max(1, height) };
    }
    if (width <= maxDimension && height <= maxDimension) {
        return { width, height };
    }
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio)
    };
};

/**
 * Optimizes an image (File object or Data URL string) client-side.
 * Resolves with compressed JPEG Data URL and raw base64 data.
 */
export const optimizeImage = async (
    source: File | string,
    maxDimension: number = MAX_IMAGE_DIMENSION,
    quality: number = COMPRESSION_QUALITY
): Promise<ProcessedImage> => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('Image optimization requires a browser DOM environment.');
    }

    return new Promise((resolve, reject) => {
        let objectUrl: string | null = null;
        const img = new Image();

        img.onload = () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }

            try {
                const naturalWidth = img.naturalWidth || img.width;
                const naturalHeight = img.naturalHeight || img.height;

                if (!naturalWidth || !naturalHeight) {
                    reject(new Error('Invalid or unreadable image dimensions.'));
                    return;
                }

                const { width, height } = calculateTargetDimensions(naturalWidth, naturalHeight, maxDimension);

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to acquire 2D canvas context.'));
                    return;
                }

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                const mimeType = 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType, quality);
                const [header, base64] = dataUrl.split(',');

                resolve({
                    dataUrl,
                    base64Data: base64 || '',
                    mimeType: header.match(/:(.*?);/)?.[1] || mimeType,
                    width,
                    height
                });
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            reject(new Error('Failed to load image source for optimization.'));
        };

        if (source instanceof File) {
            objectUrl = URL.createObjectURL(source);
            img.src = objectUrl;
        } else if (typeof source === 'string') {
            img.src = source;
        } else {
            reject(new Error('Unsupported source format for image optimization.'));
        }
    });
};
