/**
 * Image Compression Utility
 * 
 * This utility provides client-side image compression using the browser-image-compression library.
 * It offers optimized compression settings for different use cases:
 * - Gallery images (optimized for display in the gallery)
 * - Blog cover images (optimized for header/banner use)
 * - Profile photos (optimized for profile/avatar use)
 */

// Create a namespace for the ImageCompressor to avoid global scope pollution
window.ImageCompressor = (function() {
  // Default options that apply to all compression types
  const defaultOptions = {
    useWebWorker: true,
    onProgress: undefined, // Can be set by caller if progress updates are needed
  };

  /**
   * Compresses an image for gallery use
   * - Optimized for displaying in a gallery view
   * - Maintains good quality while reducing file size
   * 
   * @param {File|Blob} imageFile - The original image file to compress
   * @param {Object} additionalOptions - Additional compression options to override defaults
   * @returns {Promise<File>} A promise that resolves to the compressed image file
   */
  async function compressGalleryImage(imageFile, additionalOptions = {}) {
    if (!imageFile || !(imageFile instanceof Blob)) {
      throw new Error('Invalid image file provided');
    }

    // Gallery-specific options
    const options = {
      ...defaultOptions,
      maxSizeMB: 0.8, // Limit to 800KB
      maxWidthOrHeight: 1600, // Maintain good quality for gallery view
      ...additionalOptions
    };

    try {
      // Use the browser-image-compression library for compression
      const compressedFile = await imageCompression(imageFile, options);
      
      // Preserve the original file name with a suffix
      const compressedFileName = getCompressedFileName(imageFile.name, 'gallery');
      
      return new File([compressedFile], compressedFileName, {
        type: compressedFile.type,
        lastModified: new Date().getTime()
      });
    } catch (error) {
      console.error('Error compressing gallery image:', error);
      throw error;
    }
  }

  /**
   * Compresses an image for blog cover use
   * - Optimized for large banner/header display
   * - Higher quality than gallery images since they're focal points
   * 
   * @param {File|Blob} imageFile - The original image file to compress
   * @param {Object} additionalOptions - Additional compression options to override defaults
   * @returns {Promise<File>} A promise that resolves to the compressed image file
   */
  async function compressBlogCoverImage(imageFile, additionalOptions = {}) {
    if (!imageFile || !(imageFile instanceof Blob)) {
      throw new Error('Invalid image file provided');
    }

    // Blog cover specific options - higher quality than gallery
    const options = {
      ...defaultOptions,
      maxSizeMB: 1.0, // Limit to 1.2MB for better quality
      maxWidthOrHeight: 2000, // Larger size for header/banner use
      initialQuality: 0.85, // Higher quality for focal images
      ...additionalOptions
    };

    try {
      const compressedFile = await imageCompression(imageFile, options);
      
      // Preserve the original file name with a suffix
      const compressedFileName = getCompressedFileName(imageFile.name, 'blog');
      
      return new File([compressedFile], compressedFileName, {
        type: compressedFile.type,
        lastModified: new Date().getTime()
      });
    } catch (error) {
      console.error('Error compressing blog cover image:', error);
      throw error;
    }
  }

  /**
   * Compresses an image for profile photo use
   * - Optimized for smaller avatar display
   * - Significant size reduction since these are typically displayed small
   * 
   * @param {File|Blob} imageFile - The original image file to compress
   * @param {Object} additionalOptions - Additional compression options to override defaults
   * @returns {Promise<File>} A promise that resolves to the compressed image file
   */
  async function compressProfileImage(imageFile, additionalOptions = {}) {
    if (!imageFile || !(imageFile instanceof Blob)) {
      throw new Error('Invalid image file provided');
    }

    // Profile photo specific options - smaller size
    const options = {
      ...defaultOptions,
      maxSizeMB: 0.3, // Limit to 300KB
      maxWidthOrHeight: 800, // Smaller size for profile display
      ...additionalOptions
    };

    try {
      const compressedFile = await imageCompression(imageFile, options);
      
      // Preserve the original file name with a suffix
      const compressedFileName = getCompressedFileName(imageFile.name, 'profile');
      
      return new File([compressedFile], compressedFileName, {
        type: compressedFile.type,
        lastModified: new Date().getTime()
      });
    } catch (error) {
      console.error('Error compressing profile image:', error);
      throw error;
    }
  }

  /**
   * Helper function to generate a name for the compressed file
   * 
   * @param {string} originalFileName - The original file name
   * @param {string} type - The type of compression (gallery, blog, profile)
   * @returns {string} The new file name for the compressed image
   */
  function getCompressedFileName(originalFileName, type) {
    // Split the filename and extension
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const name = lastDotIndex !== -1 ? originalFileName.substring(0, lastDotIndex) : originalFileName;
    const extension = lastDotIndex !== -1 ? originalFileName.substring(lastDotIndex) : '';
    
    // Add a suffix based on the type
    return `${name}-compressed-${type}${extension}`;
  }

  // Return the public API
  /**
   * Compresses an image for blog content use
   * - Optimized for inline blog content images
   * - Balanced compression to ensure clarity of text/diagrams while reducing size
   * 
   * @param {File|Blob} imageFile - The original image file to compress
   * @param {Object} additionalOptions - Additional compression options to override defaults
   * @returns {Promise<File>} A promise that resolves to the compressed image file
   */
  async function compressBlogContentImage(imageFile, additionalOptions = {}) {
    if (!imageFile || !(imageFile instanceof Blob)) {
      throw new Error('Invalid image file provided');
    }

    // Blog content specific options - balanced settings
    const options = {
      ...defaultOptions,
      maxSizeMB: 0.6, // Limit to 600KB
      maxWidthOrHeight: 1200, // Good size for inline content
      initialQuality: 0.8, // Reasonable quality for content images
      ...additionalOptions
    };

    try {
      const compressedFile = await imageCompression(imageFile, options);
      
      // Preserve the original file name with a suffix
      const compressedFileName = getCompressedFileName(imageFile.name, 'blog-content');
      
      return new File([compressedFile], compressedFileName, {
        type: compressedFile.type,
        lastModified: new Date().getTime()
      });
    } catch (error) {
      console.error('Error compressing blog content image:', error);
      throw error;
    }
  }

  // Return the public API
  return {
    compressGalleryImage,
    compressBlogCoverImage,
    compressProfileImage,
    compressBlogContentImage
  };
})();
