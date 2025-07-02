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
                        <input type="file" accept="image/*" style="display: none;">
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
                    ['link', 'image'],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });

        // Setup event listeners
        this.container.querySelector('.cover-preview').addEventListener('click', () => {
            this.container.querySelector('input[type="file"]').click();
        });

        this.container.querySelector('input[type="file"]').addEventListener('change', (e) => {
            this.handleCoverImageUpload(e.target.files[0]);
        });

        this.container.querySelector('.cancel-btn').addEventListener('click', () => {
            this.hide();
        });

        this.container.querySelector('.draft-btn').addEventListener('click', () => {
            this.saveBlog(false);
        });

        this.container.querySelector('.publish-btn').addEventListener('click', () => {
            this.saveBlog(true);
        });
    }

    async handleImageUpload(file) {
        try {
            const formData = new FormData();
            formData.append('image', file);

            const headers = getAuthHeaders();
            if (!headers) return;
            delete headers['Content-Type']; // Let browser set correct content-type for FormData

            const response = await fetch('/dev/gallery/upload', {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            
            // Insert the image into the editor
            const range = this.quill.getSelection();
            this.quill.insertEmbed(range.index, 'image', data.url);
            
            return data.url;
        } catch (error) {
            console.error('Image upload failed:', error);
            showNotification('Failed to upload image', 'error');
            throw error;
        }
    }

    async handleCoverImageUpload(file) {
        try {
            const formData = new FormData();
            formData.append('image', file);

            const headers = getAuthHeaders();
            if (!headers) return;
            delete headers['Content-Type']; // Let browser set correct content-type for FormData

            const response = await fetch('/dev/gallery/upload', {
                method: 'POST',
                headers,
                body: formData,
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            const preview = this.container.querySelector('.cover-preview');
            preview.innerHTML = `<img src="${data.url}" alt="Cover Image">`;
            preview.classList.add('has-image');
            this.coverImageUrl = data.url;
        } catch (error) {
            console.error('Cover image upload failed:', error);
            showNotification('Failed to upload cover image', 'error');
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

            const blog = await response.json();
            this.currentBlogId = blogId;
            
            this.container.querySelector('.title-input').value = blog.title;
            this.container.querySelector('.category-input').value = blog.category || '';
            this.container.querySelector('.tags-input').value = blog.tags?.join(', ') || '';
            
            if (blog.coverImage) {
                const preview = this.container.querySelector('.cover-preview');
                preview.innerHTML = `<img src="${blog.coverImage}" alt="Cover Image">`;
                preview.classList.add('has-image');
                this.coverImageUrl = blog.coverImage;
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

            const response = await fetch(url, {
                method: this.currentBlogId ? 'PUT' : 'POST',
                headers,
                body: JSON.stringify(blogData),
            });

            if (!response.ok) throw new Error('Failed to save blog post');

            showNotification('Blog post saved successfully', 'success');
            this.hide();
            window.dispatchEvent(new CustomEvent('blogUpdated'));
        } catch (error) {
            console.error('Failed to save blog:', error);
            showNotification('Failed to save blog post', 'error');
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
