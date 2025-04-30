/**
 * Admin Image Upload Handler
 * Handles image uploads for QuillJS editor with resizable image support
 * Compatible with both local storage and S3
 */

(function() {
    /**
     * QuillImageUploader
     * A class to handle image uploads for QuillJS editor 
     * Works with resizable images and both local/S3 storage
     */
    class QuillImageUploader {
        /**
         * Initialize the image uploader
         * @param {Object} options - Configuration options
         * @param {string} options.endpoint - API endpoint for uploading images
         * @param {Function} options.onSuccess - Callback when upload succeeds
         * @param {Function} options.onError - Callback when upload fails
         * @param {Function} options.onProgress - Callback for upload progress
         */
        constructor(options = {}) {
            this.options = Object.assign({
                endpoint: '/api/blog/images/upload',
                onSuccess: () => {},
                onError: () => {},
                onProgress: () => {}
            }, options);
            
            // Bind methods
            this.uploadImage = this.uploadImage.bind(this);
            this.insertImage = this.insertImage.bind(this);
            this.readFileAsDataURL = this.readFileAsDataURL.bind(this);
            this.getImageDimensions = this.getImageDimensions.bind(this);
        }
        
        /**
         * Handle image upload to server
         * @param {File} imageFile - The image file to upload
         * @returns {Promise} Promise with the uploaded image URL
         */
        async uploadImage(imageFile) {
            if (!imageFile) {
                return Promise.reject(new Error('No image file provided'));
            }
            
            // Create a FormData object
            const formData = new FormData();
            formData.append('image', imageFile);
            
            try {
                // Get authentication token from localStorage
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    throw new Error('Authentication required. Please log in again.');
                }
                
                // Upload the image to server
                const response = await fetch(this.options.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData,
                });
                
                if (!response.ok) {
                    throw new Error(`Failed to upload image: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                // Call the success callback
                if (typeof this.options.onSuccess === 'function') {
                    this.options.onSuccess(result);
                }
                
                return result;
            } catch (error) {
                console.error('Error uploading image:', error);
                
                // Call the error callback
                if (typeof this.options.onError === 'function') {
                    this.options.onError(error);
                }
                
                throw error;
            }
        }
        
        /**
         * Insert an image into the editor at current cursor position
         * @param {Quill} quill - The Quill editor instance
         * @param {string} imageUrl - URL of the image to insert
         * @param {Object} metadata - Additional image metadata
         */
        async insertImage(quill, imageUrl, metadata = {}) {
            if (!quill || !imageUrl) return;
            
            try {
                // Get current selection
                const range = quill.getSelection(true);
                
                // Load image to get dimensions
                const dimensions = await this.getImageDimensions(imageUrl);
                
                // Create image data with dimensions
                const imageData = {
                    src: imageUrl,
                    alt: metadata.alt || '',
                    width: dimensions.width,
                    height: dimensions.height,
                    originalWidth: dimensions.width,
                    originalHeight: dimensions.height
                };
                
                // Insert the resizable image at the cursor position
                quill.insertEmbed(range.index, 'resizable-image', imageData, 'user');
                
                // Move cursor to after the inserted image
                quill.setSelection(range.index + 1, 0);
                
                // Trigger text-change event to ensure content is saved
                const changeEvent = new Event('text-change', { bubbles: true });
                quill.root.dispatchEvent(changeEvent);
                
                return imageData;
            } catch (error) {
                console.error('Error inserting image:', error);
                throw error;
            }
        }
        
        /**
         * Upload an image file and insert it into the editor
         * @param {Quill} quill - The Quill editor instance
         * @param {File} imageFile - The image file to upload
         * @param {Object} metadata - Additional image metadata
         */
        async uploadAndInsert(quill, imageFile, metadata = {}) {
            try {
                // Upload the image
                const result = await this.uploadImage(imageFile);
                
                // Insert the image with URL from result
                await this.insertImage(quill, result.url, metadata);
                
                return result;
            } catch (error) {
                console.error('Error uploading and inserting image:', error);
                throw error;
            }
        }
        
        /**
         * Get image dimensions (width & height)
         * @param {string} imageUrl - URL of the image
         * @returns {Promise<Object>} Object with width and height
         */
        getImageDimensions(imageUrl) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                
                img.onload = () => {
                    const width = img.naturalWidth;
                    const height = img.naturalHeight;
                    
                    // Limit maximum dimensions for better performance
                    const MAX_WIDTH = 1200;
                    let finalWidth = width;
                    let finalHeight = height;
                    
                    if (width > MAX_WIDTH) {
                        const ratio = MAX_WIDTH / width;
                        finalWidth = MAX_WIDTH;
                        finalHeight = Math.round(height * ratio);
                    }
                    
                    resolve({
                        width: finalWidth,
                        height: finalHeight,
                        originalWidth: width,
                        originalHeight: height
                    });
                };
                
                img.onerror = (error) => {
                    reject(error || new Error('Failed to load image'));
                };
                
                img.src = imageUrl;
            });
        }
        
        /**
         * Read a file as data URL
         * @param {File} file - The file to read
         * @returns {Promise<string>} Promise with the data URL
         */
        readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    resolve(event.target.result);
                };
                
                reader.onerror = (error) => {
                    reject(error);
                };
                
                reader.readAsDataURL(file);
            });
        }
        
        /**
         * Handler for toolbar image button click
         * Opens the file selector to pick an image
         * @param {Object} options - Options for the image handler
         * @returns {Function} Function to handle the image button click
         */
        static getToolbarHandler(options) {
            const uploader = new QuillImageUploader(options);
            
            return function() {
                const quill = this.quill;
                const fileInput = document.createElement('input');
                fileInput.setAttribute('type', 'file');
                fileInput.setAttribute('accept', 'image/*');
                fileInput.setAttribute('style', 'display: none');
                
                fileInput.addEventListener('change', async (e) => {
                    if (fileInput.files && fileInput.files[0]) {
                        const file = fileInput.files[0];
                        
                        // Show loading indicator
                        if (options.showLoading) {
                            options.showLoading();
                        }
                        
                        try {
                            // Upload and insert the image
                            await uploader.uploadAndInsert(quill, file);
                            
                            // Hide loading indicator
                            if (options.hideLoading) {
                                options.hideLoading();
                            }
                        } catch (error) {
                            console.error('Error handling image upload:', error);
                            
                            // Hide loading indicator
                            if (options.hideLoading) {
                                options.hideLoading();
                            }
                            
                            // Show error notification
                            if (options.showError) {
                                options.showError(`Failed to upload image: ${error.message}`);
                            }
                        }
                    }
                    
                    // Clean up
                    document.body.removeChild(fileInput);
                });
                
                document.body.appendChild(fileInput);
                fileInput.click();
            };
        }
    }
    
    // Export the class globally
    window.QuillImageUploader = QuillImageUploader;
})();
