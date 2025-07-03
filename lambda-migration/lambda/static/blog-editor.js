class BlogEditor {
    constructor(container) {
        this.container = container;
        this.currentBlogId = null;
        this.setupEditor();
    }

    setupEditor() {
        this.container.innerHTML = `
            <div class="editor-header">
                <input type="text" class="title-input" placeholder="Blog Title">
                <div class="cover-image-section">
                    <div class="cover-preview">
                        <span>Click to add cover image</span>
                        <input type="file" id="cover-image-input" accept="image/*" style="display: none;">
                    </div>
                </div>
                <div class="meta-section">
                    <input type="text" class="category-input" placeholder="Category">
                    <input type="text" class="tags-input" placeholder="Tags (comma separated)">
                </div>
            </div>
            <div id="blog-content-editor" style="height: 400px;"></div>
            <div class="editor-footer">
                <button class="cancel-btn">Cancel</button>
                <button class="secondary-btn draft-btn">Save as Draft</button>
                <button class="primary-btn publish-btn">Publish</button>
            </div>
        `;

        try {
            // Initialize Quill
            this.quill = new Quill('#blog-content-editor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'header': 1 }, { 'header': 2 }],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'script': 'sub' }, { 'script': 'super' }],
                        [{ 'indent': '-1' }, { 'indent': '+1' }],
                        ['link'],
                        [{ 'align': [] }],
                        ['clean']
                    ]
                }
            });

            // Setup event listeners with error handling
            const coverPreview = this.container.querySelector('.cover-preview');
            if (coverPreview) {
                coverPreview.addEventListener('click', () => {
                    const fileInput = this.container.querySelector('#cover-image-input');
                    if (fileInput) {
                        fileInput.click();
                    }
                });
            }

            const fileInput = this.container.querySelector('#cover-image-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleCoverImageUpload(e.target.files[0]);
                    }
                });
            }

            const cancelBtn = this.container.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.hide();
                    // Trigger blog reload when canceling
                    window.dispatchEvent(new CustomEvent('blogUpdated'));
                });
            }

            const draftBtn = this.container.querySelector('.draft-btn');
            if (draftBtn) {
                draftBtn.addEventListener('click', () => {
                    this.saveBlog(false);
                });
            }

            const publishBtn = this.container.querySelector('.publish-btn');
            if (publishBtn) {
                publishBtn.addEventListener('click', () => {
                    this.saveBlog(true);
                });
            }
        } catch (error) {
            console.error('Error setting up blog editor:', error);
            showNotification('Error setting up blog editor', 'error');
        }
    }

    async handleImageUpload(file) {
        try {
            // 1. Get headers for authentication
            const headers = getAuthHeaders();
            if (!headers) return;

            // 2. Request a presigned URL from the server
            const presignedResponse = await fetch('/dev/gallery/upload', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type
                })
            });

            if (!presignedResponse.ok) throw new Error('Failed to get upload URL');

            const presignedData = await presignedResponse.json();
            console.log('Received presigned URL data for content image:', presignedData);

            // 3. Upload the file directly to S3 using the presigned URL
            const uploadResponse = await fetch(presignedData.uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            if (!uploadResponse.ok) throw new Error('S3 upload failed');
    
            // Return the S3 key (not the URL) to be stored
            return presignedData.s3Key;
        } catch (error) {
            console.error('Image upload failed:', error);
            showNotification('Failed to upload image', 'error');
            throw error;
        }
    }

    async handleCoverImageUpload(file) {
        try {
            const preview = this.container.querySelector('.cover-preview');
            if (!preview) return;

            // Show loading state
            preview.innerHTML = `
                <div class="loading-indicator">Uploading...</div>
                <input type="file" id="cover-image-input" accept="image/*" style="display: none;">
            `;

            // 1. Use the existing handleImageUpload method to upload the file and get the S3 key
            this.coverImageUrl = await this.handleImageUpload(file);

            if (!this.coverImageUrl) throw new Error('Failed to upload image');

            // 2. Get a presigned URL for the image to display in the preview
            // GET requests to gallery/upload don't require authentication
            const imageUrlResponse = await fetch(`/dev/gallery/upload?key=${encodeURIComponent(this.coverImageUrl)}`);

            if (!imageUrlResponse.ok) throw new Error('Failed to get image URL');
            
            const imageUrlData = await imageUrlResponse.json();
            const imageUrl = imageUrlData.url;
            
            // 3. Update the preview with the new image
            preview.innerHTML = `
                <img src="${imageUrl}" alt="Cover Image">
                <input type="file" id="cover-image-input" accept="image/*" style="display: none;">
            `;
            preview.classList.add('has-image');
            
            // 4. Re-attach the click event listener for the cover image
            preview.addEventListener('click', () => {
                const fileInput = preview.querySelector('#cover-image-input');
                if (fileInput) {
                    fileInput.click();
                }
            });
            
            // 5. Re-attach change event listener for the file input
            const fileInput = preview.querySelector('#cover-image-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleCoverImageUpload(e.target.files[0]);
                    }
                });
            }
            
            console.log('Cover image uploaded successfully:', this.coverImageUrl);
            showNotification('Cover image uploaded successfully', 'success');
        } catch (error) {
            console.error('Cover image upload failed:', error);
            showNotification('Failed to upload cover image', 'error');
            
            // Reset the preview on error
            const preview = this.container.querySelector('.cover-preview');
            if (preview) {
                preview.innerHTML = `
                    <span>Click to add cover image</span>
                    <input type="file" id="cover-image-input" accept="image/*" style="display: none;">
                `;
                preview.classList.remove('has-image');
                
                // Re-attach event listeners
                preview.addEventListener('click', () => {
                    const fileInput = preview.querySelector('#cover-image-input');
                    if (fileInput) {
                        fileInput.click();
                    }
                });
                
                const fileInput = preview.querySelector('#cover-image-input');
                if (fileInput) {
                    fileInput.addEventListener('change', (e) => {
                        if (e.target.files && e.target.files[0]) {
                            this.handleCoverImageUpload(e.target.files[0]);
                        }
                    });
                }
            }
        }
    }

    async loadBlog(blogId) {
        try {
            const headers = getAuthHeaders();
            if (!headers) return;

            const response = await fetch(`/dev/blog/${blogId}`, {
                headers,
                credentials: 'include'
            });

        if (!response.ok) throw new Error('Failed to load blog post');

        const responseData = await response.json();
        
        // Check if we have a success response with a post field
        if (!responseData.success || !responseData.post) {
            throw new Error('Invalid blog post data structure');
        }
        
        const blog = responseData.post;
        this.currentBlogId = blogId;
        
        this.container.querySelector('.title-input').value = blog.title;
        this.container.querySelector('.category-input').value = blog.category || '';
        this.container.querySelector('.tags-input').value = blog.tags?.join(', ') || '';
            
        if (blog.coverImage) {
            const preview = this.container.querySelector('.cover-preview');
            // Safely handle coverImage which might be null, an object, or a string
            let imageUrl = '';
            if (blog.coverImage) {
                imageUrl = typeof blog.coverImage === 'object' && blog.coverImage.url 
                    ? blog.coverImage.url 
                    : blog.coverImage;
            }
            
            // Display the image in the preview while preserving the file input
            if (imageUrl) {
                preview.innerHTML = `
                    <img src="${imageUrl}" alt="Cover Image">
                    <input type="file" id="cover-image-input" accept="image/*" style="display: none;">
                `;
                preview.classList.add('has-image');
            } else {
                // Reset to default if no image
                preview.innerHTML = `
                    <span>Click to add cover image</span>
                    <input type="file" id="cover-image-input" accept="image/*" style="display: none;">
                `;
                preview.classList.remove('has-image');
            }
            
            // Store the coverImage data structure as is
            this.coverImageUrl = blog.coverImage;
            
            // Re-attach the click event listener for the cover image
            preview.addEventListener('click', () => {
                const fileInput = preview.querySelector('#cover-image-input');
                if (fileInput) {
                    fileInput.click();
                }
            });
            
            // Re-attach change event listener for the file input
            const fileInput = preview.querySelector('#cover-image-input');
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleCoverImageUpload(e.target.files[0]);
                    }
                });
            }
        }

            // Set content in Quill editor
            this.quill.root.innerHTML = blog.content;
            
            // Update buttons based on publish status
            const draftBtn = this.container.querySelector('.draft-btn');
            const publishBtn = this.container.querySelector('.publish-btn');
            
            if (blog.status === 'published') {
                draftBtn.textContent = 'Unpublish';
                publishBtn.textContent = 'Update';
            } else {
                draftBtn.textContent = 'Save as Draft';
                publishBtn.textContent = 'Publish';
            }

            this.show();
        } catch (error) {
            console.error('Failed to load blog:', error);
            showNotification('Failed to load blog post', 'error');
        }
    }

    async saveBlog(publish = false) {
        try {
            const title = this.container.querySelector('.title-input').value;
            const category = this.container.querySelector('.category-input').value;
            const tags = this.container.querySelector('.tags-input').value
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
            const content = this.quill.root.innerHTML;

            const blogData = {
                title,
                content,
                category,
                tags,
                coverImage: this.coverImageUrl,
                status: publish ? 'published' : 'draft'
            };

            const url = this.currentBlogId 
                ? `/dev/blog/${this.currentBlogId}`
                : '/dev/blog';

            const headers = getAuthHeaders();
            if (!headers) return;

            console.log('Saving blog with data:', JSON.stringify(blogData));
            
            const response = await fetch(url, {
                method: this.currentBlogId ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(blogData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save blog post');
            }

            const data = await response.json();
            console.log('Blog save response:', data);

            showNotification('Blog post saved successfully', 'success');
            this.hide();
            window.dispatchEvent(new CustomEvent('blogUpdated'));
        } catch (error) {
            console.error('Failed to save blog:', error);
            showNotification(`Failed to save blog: ${error.message}`, 'error');
        }
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
        this.currentBlogId = null;
        this.coverImageUrl = null;
        
        // Reset form
        this.container.querySelector('.title-input').value = '';
        this.container.querySelector('.category-input').value = '';
        this.container.querySelector('.tags-input').value = '';
        this.container.querySelector('.cover-preview').innerHTML = '<span>Click to add cover image</span>';
        this.container.querySelector('.cover-preview').classList.remove('has-image');
        this.quill.setText('');
        
        // Reset buttons
        this.container.querySelector('.draft-btn').textContent = 'Save as Draft';
        this.container.querySelector('.publish-btn').textContent = 'Publish';
        
        // Trigger blog list reload - don't call hideBlogEditor directly to avoid recursion
        window.dispatchEvent(new CustomEvent('blogUpdated'));
    }
}

// Helper function for getting auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/dev/login.html';
        return null;
    }
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

// Helper function for notifications
function showNotification(message, type = 'success') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
