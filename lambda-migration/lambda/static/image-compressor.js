/**
 * Image Compression Utility
 * 
 * Uses browser-image-compression to efficiently reduce the size of uploaded images
 * while maintaining reasonable quality for web display.
 */

// Import the browser-image-compression library
import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file for web upload
 * 
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @param {number} options.maxSizeMB - Maximum file size in MB (default: 1)
 * @param {number} options.maxWidthOrHeight - Maximum width or height in pixels (default: 1920)
 * @param {boolean} options.useWebWorker - Whether to use web worker for compression (default: true)
 * @param {number} options.quality - JPEG/PNG compression quality between 0-1 (default: 0.8)
 * @returns {Promise<File>} - The compressed image file
 */
export async function compressImage(file, customOptions = {}) {
    try {
        // Default options for general web usage - good balance of quality vs size
        const defaultOptions = {
            maxSizeMB: 1,              // Maximum file size
            maxWidthOrHeight: 1920,    // Limit dimensions while maintaining aspect ratio
            useWebWorker: true,        // Use web worker for better UI performance
            quality: 0.8,              // Image quality (0.8 = 80%, good balance)
            alwaysKeepResolution: false, // Allow resizing for large images
            initialQuality: 0.8,        // Initial quality to try
        };

        // Merge default options with any custom options
        const options = { ...defaultOptions, ...customOptions };

        // Skip compression for small files that are already optimized
        if (file.size < 150 * 1024) { // If less than 150KB
            console.log('Image already small enough, skipping compression');
            return file;
        }

        // Compress the image
        console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        const compressedFile = await imageCompression(file, options);
        
        // Create a new file with original name but compressed content
        const newFile = new File([compressedFile], file.name, {
            type: compressedFile.type,
            lastModified: new Date().getTime()
        });
        
        console.log(`Compression complete: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB → ${(newFile.size / 1024 / 1024).toFixed(2)} MB)`);
        return newFile;
    } catch (error) {
        console.error('Image compression failed:', error);
        // Return the original file if compression fails
        return file;
    }
}

/**
 * Compresses an image for profile photos (smaller dimensions, better quality)
 * 
 * @param {File} file - The image file to compress
 * @returns {Promise<File>} - The compressed image file
 */
export async function compressProfileImage(file) {
    return compressImage(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 500,
        quality: 0.85
    });
}

/**
 * Compresses an image for gallery display (larger dimensions, balanced quality)
 * 
 * @param {File} file - The image file to compress
 * @returns {Promise<File>} - The compressed image file
 */
export async function compressGalleryImage(file) {
    return compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        quality: 0.8
    });
}

/**
 * Compresses an image for blog cover (large dimensions, high quality)
 * 
 * @param {File} file - The image file to compress
 * @returns {Promise<File>} - The compressed image file
 */
export async function compressBlogCoverImage(file) {
    return compressImage(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2000,
        quality: 0.85
    });
}

/**
 * Compresses an image for blog content (medium dimensions, good quality)
 * 
 * @param {File} file - The image file to compress
 * @returns {Promise<File>} - The compressed image file
 */
export async function compressBlogContentImage(file) {
    return compressImage(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        quality: 0.8
    });
}
