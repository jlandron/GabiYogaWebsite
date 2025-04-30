/**
 * Admin Blog Manager
 * Handles the blog posts management in the admin area
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the blog manager
    const blogManager = new BlogManager();
    blogManager.init();
});

/**
 * BlogManager Class
 * Manages all functionality for the blog admin
 */
class BlogManager {
    constructor() {
        // DOM Elements - Main panels
        this.blogPanel = document.getElementById('blog-panel');
        this.editorPanel = document.getElementById('blog-editor-panel');
        
        // Blog posts list elements
        this.postsTable = document.querySelector('.blog-posts-table');
        this.postsTableBody = document.getElementById('blog-posts-list');
        this.emptyPostsMessage = document.getElementById('blog-posts-empty');
        this.newPostBtn = document.getElementById('new-post-btn');
        this.filterSelect = document.getElementById('blog-filter');
        this.searchInput = document.getElementById('blog-search');
        this.searchBtn = document.querySelector('.search-btn');
        
        // Editor elements
        this.postForm = document.getElementById('blog-post-form');
        this.editorTitle = document.querySelector('#blog-editor-panel .admin-title');
        this.editorStatus = document.getElementById('editor-status');
        this.postTitle = document.getElementById('post-title');
        this.postSlug = document.getElementById('post-slug');
        this.postExcerpt = document.getElementById('post-excerpt');
        this.postContent = document.getElementById('post-content');
        this.postAuthor = document.getElementById('post-author');
        this.postTags = document.getElementById('post-tags');
        this.featuredImagePreview = document.getElementById('featured-image');
        this.featuredImagePlaceholder = document.getElementById('featured-image-placeholder');
        this.setFeaturedImageBtn = document.getElementById('set-featured-image-btn');
        this.removeFeaturedImageBtn = document.getElementById('remove-featured-image-btn');
        this.featuredImageUpload = document.getElementById('featured-image-upload');
        this.featuredImageAlt = document.getElementById('featured-image-alt');
        this.backToPostsBtn = document.getElementById('back-to-posts-btn');
        this.previewPostBtn = document.getElementById('preview-post-btn');
        this.saveDraftBtn = document.getElementById('save-draft-btn');
        this.publishPostBtn = document.getElementById('publish-post-btn');
        this.addMoreImagesBtn = document.getElementById('add-more-images-btn');
        
        // Blog images elements
        this.blogImagesContainer = document.getElementById('blog-images-container');
        this.blogImagesGallery = document.getElementById('blog-images-gallery');
        
        // Modal elements
        this.previewModal = document.getElementById('post-preview-modal');
        this.previewTitle = document.getElementById('preview-title');
        this.previewAuthor = document.getElementById('preview-author');
        this.previewDate = document.getElementById('preview-date');
        this.previewContent = document.getElementById('preview-content');
        this.closePreviewBtn = document.getElementById('close-preview');
        
        // Image selection modal
        this.imageModal = document.getElementById('image-selection-modal');
        this.imageUploadZone = document.getElementById('image-upload-zone');
        this.imageFileInput = document.getElementById('image-file-input');
        this.imageGallery = document.getElementById('image-gallery');
        this.cancelImageBtn = document.getElementById('cancel-image-selection');
        this.selectImageBtn = document.getElementById('select-image');
        this.editorImageUpload = document.getElementById('image-upload');
        
        // Delete confirmation modal
        this.deleteModal = document.getElementById('delete-confirm-modal');
        this.deletePostTitle = document.getElementById('delete-post-title');
        this.cancelDeleteBtn = document.getElementById('cancel-delete');
        this.confirmDeleteBtn = document.getElementById('confirm-delete');
        
        // State
        this.currentPost = null;
        this.posts = [];
        this.images = [];
        this.selectedImage = null;
        this.imageInsertCallback = null;
        this.postToDelete = null;
        this.isEditMode = false;
        
        // Object URL tracking for proper cleanup
        this._previousFeaturedImageObjectUrl = null;
        
        // Image compression options
        this.imageOptions = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.9
        };
        
        // Bind event handlers
        this.bindEvents();
    }
    
    /**
     * Initialize the blog manager
     */
    async init() {
        try {
            // Initialize text editor toolbar
            this.initEditorToolbar();
            
            // Hide editor panel by default
            if (this.editorPanel) {
                this.editorPanel.classList.remove('active');
            }
            
            // Load blog posts
            await this.loadPosts();
            
            // We'll comment out loadImages for now as it's not implemented
            await this.loadImages();
        } catch (error) {
            console.error('Error initializing blog manager:', error);
            this.showNotification('Failed to initialize blog manager. Please try refreshing the page.', 'error');
        }
    }
    
    /**
     * Bind event handlers
     */
    bindEvents() {
        if (this.previewPostBtn) {
            this.previewPostBtn.addEventListener('click', () => this.previewPost());
        }
        
        if (this.saveDraftBtn) {
            this.saveDraftBtn.addEventListener('click', () => this.savePost(false));
        }
        
        if (this.publishPostBtn) {
            this.publishPostBtn.addEventListener('click', () => this.savePost(true));
        }
        
        // Featured image events
        if (this.setFeaturedImageBtn) {
            this.setFeaturedImageBtn.addEventListener('click', () => this.openImageSelectionModal('featured'));
        }
        
        if (this.featuredImageUpload) {
            this.featuredImageUpload.addEventListener('change', (e) => this.handleFeaturedImageUpload(e));
        }
        
        if (this.removeFeaturedImageBtn) {
            this.removeFeaturedImageBtn.addEventListener('click', () => this.removeFeaturedImage());
        }
        
        // Add More Images button
        if (this.addMoreImagesBtn) {
            this.addMoreImagesBtn.addEventListener('click', () => this.openImageSelectionModal('content'));
        }
        
        // Image selection modal events
        if (this.imageUploadZone) {
            this.imageUploadZone.addEventListener('click', () => this.imageFileInput.click());
            this.imageUploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.imageUploadZone.addEventListener('dragleave', () => this.imageUploadZone.classList.remove('dragover'));
            this.imageUploadZone.addEventListener('drop', (e) => this.handleImageDrop(e));
        }
        
        if (this.imageFileInput) {
            this.imageFileInput.addEventListener('change', (e) => this.handleImageFileSelect(e));
        }
        
        if (this.cancelImageBtn) {
            this.cancelImageBtn.addEventListener('click', () => this.closeImageModal());
        }
        
        if (this.selectImageBtn) {
            this.selectImageBtn.addEventListener('click', () => this.selectAndInsertImage());
        }
        
        // Filter and search events
        if (this.filterSelect) {
            this.filterSelect.addEventListener('change', () => this.filterPosts());
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchPosts();
                }
            });
        }
        
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.searchPosts());
        }
        
        // Preview modal events
        if (this.closePreviewBtn) {
            this.closePreviewBtn.addEventListener('click', () => this.closePreviewModal());
        }
        
        // Delete modal events
        if (this.cancelDeleteBtn) {
            this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        }
        
        if (this.confirmDeleteBtn) {
            this.confirmDeleteBtn.addEventListener('click', () => this.deleteSelectedPost());
        }
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (this.previewModal && e.target === this.previewModal) {
                this.closePreviewModal();
            }
            
            if (this.imageModal && e.target === this.imageModal) {
                this.closeImageModal();
            }
            
            if (this.deleteModal && e.target === this.deleteModal) {
                this.closeDeleteModal();
            }
        });
        
        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.previewModal && this.previewModal.classList.contains('show')) {
                    this.closePreviewModal();
                }
                
                if (this.imageModal && this.imageModal.classList.contains('show')) {
                    this.closeImageModal();
                }
                
                if (this.deleteModal && this.deleteModal.classList.contains('show')) {
                    this.closeDeleteModal();
                }
            }
        });
    }
    
    /**
     * Initialize the QuillJS text editor
     */
    initEditorToolbar() {
        console.log('Initializing blog post editor with resizable image support');
        
        // Check if the textarea exists
        if (!this.postContent) {
            console.error('Post content textarea not found');
            return;
        }
        
        // Create image uploader instance for direct uploads
        this.imageUploader = new QuillImageUploader({
            endpoint: '/api/blog/images/upload',
            onSuccess: (result) => {
                console.log('Image uploaded successfully:', result);
                
                // Add image to post images if not already there
                if (this.currentPost && this.currentPost.images) {
                    const existingImage = this.currentPost.images.find(img => img.url === result.url);
                    if (!existingImage) {
                        this.currentPost.images.push({
                            url: result.url,
                            alt: '',
                            caption: ''
                        });
                        
                        // Show the blog images container if hidden
                        if (this.blogImagesContainer) {
                            this.blogImagesContainer.style.display = '';
                        }
                        
                        // Render blog images
                        this.renderBlogImages(this.currentPost.images);
                    }
                }
            },
            onError: (error) => {
                console.error('Image upload error:', error);
                this.showNotification('Failed to upload image. Please try again.', 'error');
            },
            showLoading: () => this.showLoadingOverlay(),
            hideLoading: () => this.hideLoadingOverlay(),
            showError: (message) => this.showNotification(message, 'error')
        });
        
        // Configure custom image handler for toolbar button
        const imageHandler = QuillImageUploader.getToolbarHandler({
            endpoint: '/api/blog/images/upload',
            onSuccess: (result) => {
                console.log('Image uploaded successfully:', result);
                
                // Add image to post images if not already there
                if (this.currentPost && this.currentPost.images) {
                    const existingImage = this.currentPost.images.find(img => img.url === result.url);
                    if (!existingImage) {
                        this.currentPost.images.push({
                            url: result.url,
                            alt: '',
                            caption: ''
                        });
                        
                        // Show the blog images container if hidden
                        if (this.blogImagesContainer) {
                            this.blogImagesContainer.style.display = '';
                        }
                        
                        // Render blog images
                        this.renderBlogImages(this.currentPost.images);
                    }
                }
            },
            showLoading: () => this.showLoadingOverlay(),
            hideLoading: () => this.hideLoadingOverlay(),
            showError: (message) => this.showNotification(message, 'error')
        });
        
        // Use our reusable component to create the editor
        if (window.createQuillEditor) {
            this.quill = window.createQuillEditor('post-content', {
                defaultFont: "'Open Sans', sans-serif",
                defaultSize: "16px",
                height: 400,
                simplified: false,
                imageHandler: imageHandler
            });
            
            if (this.quill) {
                console.log('Blog post editor initialized successfully with resizable image support');
                
                // Listen for quill-image-resize-complete event to trigger update
                this.quill.root.addEventListener('quill-image-resize-complete', () => {
                    // Trigger text-change event to save content
                    const event = new Event('text-change', { bubbles: true });
                    this.quill.root.dispatchEvent(event);
                });
                
                // Add special handling for paste events to convert pasted images to resizable images
                this.quill.root.addEventListener('paste', (e) => {
                    if (e.clipboardData && e.clipboardData.items) {
                        const items = e.clipboardData.items;
                        
                        for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const file = items[i].getAsFile();
                                if (file) {
                                    this.showLoadingOverlay();
                                    
                                    this.imageUploader.uploadAndInsert(this.quill, file)
                                        .then(() => this.hideLoadingOverlay())
                                        .catch(error => {
                                            console.error('Error handling pasted image:', error);
                                            this.hideLoadingOverlay();
                                        });
                                }
                                
                                break;
                            }
                        }
                    }
                });
            } else {
                console.error('Failed to initialize blog post editor');
            }
        } else {
            console.error('createQuillEditor function not found. Make sure admin-quill-editor.js is properly loaded.');
        }
    }
    
    /**
     * Insert image at current cursor position (with resizable support)
     */
    async insertImage(imageUrl, altText = '') {
        try {
            // Use the image uploader to insert resizable image
            await this.imageUploader.insertImage(this.quill, imageUrl, { alt: altText });
            
            // Add image to post images array if not already there
            if (this.currentPost && this.currentPost.images) {
                const existingImage = this.currentPost.images.find(img => img.url === imageUrl);
                if (!existingImage) {
                    this.currentPost.images.push({
                        url: imageUrl,
                        alt: altText,
                        caption: ''
                    });
                    
                    // Show the blog images container and update display
                    if (this.blogImagesContainer) {
                        this.blogImagesContainer.style.display = '';
                    }
                    
                    // Render blog images
                    this.renderBlogImages(this.currentPost.images);
                }
            }
        } catch (error) {
            console.error('Error inserting image:', error);
            this.showNotification('Failed to insert image. Please try again.', 'error');
        }
    }
    
    /**
     * Load blog posts from the database
     */
    async loadPosts() {
        try {
            this.showLoadingOverlay();
            
            // Fetch posts from API
            const response = await fetch('/api/blog/posts');
            
            if (!response.ok) {
                throw new Error('Failed to load blog posts');
            }
            
            const data = await response.json();
            this.posts = data.posts || [];
            
            this.renderPosts();
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showNotification('Failed to load blog posts. Please try again.', 'error');
            this.hideLoadingOverlay();
            
            // Show empty state
            this.renderEmptyState();
        }
    }
    
    /**
     * Render posts in the posts table
     */
    renderPosts() {
        if (!this.postsTableBody) return;
        
        if (this.posts.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Clear table and show it
        this.postsTableBody.innerHTML = '';
        if (this.emptyPostsMessage) {
            this.emptyPostsMessage.style.display = 'none';
        }
        if (this.postsTable) {
            this.postsTable.style.display = '';
        }
        
        // Add posts to table
        this.posts.forEach(post => {
            const row = document.createElement('tr');
            
            // Format the date
            const postDate = post.publishedAt 
                ? new Date(post.publishedAt).toLocaleDateString()
                : new Date(post.createdAt).toLocaleDateString();
            
            const status = post.published ? 'Published' : 'Draft';
            const statusClass = post.published ? 'status-published' : 'status-draft';
            
            row.innerHTML = `
                <td>
                    <div class="post-title">
                        <a href="#" class="edit-post" data-id="${post._id}">${post.title || 'Untitled Post'}</a>
                    </div>
                </td>
                <td>${post.author || 'Unknown'}</td>
                <td>${postDate}</td>
                <td><span class="post-status ${statusClass}">${status}</span></td>
                <td class="admin-table-actions">
                    <button title="Edit Post" class="edit-post-btn" data-id="${post._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button title="View Post" class="view-post-btn" data-id="${post._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button title="Delete Post" class="delete-post-btn" data-id="${post._id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            
            this.postsTableBody.appendChild(row);
            
            // Add event listeners to action buttons
            const editBtns = row.querySelectorAll('.edit-post, .edit-post-btn');
            editBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const postId = btn.dataset.id;
                    this.editPost(postId);
                });
            });
            
            const viewBtn = row.querySelector('.view-post-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const postId = viewBtn.dataset.id;
                    this.viewPost(postId);
                });
            }
            
            const deleteBtn = row.querySelector('.delete-post-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const postId = deleteBtn.dataset.id;
                    this.showDeleteConfirmation(postId);
                });
            }
        });
    }
    
    /**
     * Render empty state when no posts are found
     */
    renderEmptyState() {
        if (this.postsTable) {
            this.postsTable.style.display = 'none';
        }
        
        if (this.emptyPostsMessage) {
            this.emptyPostsMessage.style.display = 'block';
        }
    }
    
    /**
     * Filter posts by status
     */
    filterPosts() {
        if (!this.filterSelect || this.posts.length === 0) return;
        
        const filter = this.filterSelect.value;
        
        let filteredPosts;
        
        switch (filter) {
            case 'published':
                filteredPosts = this.posts.filter(post => post.published);
                break;
            case 'drafts':
                filteredPosts = this.posts.filter(post => !post.published);
                break;
            default:
                filteredPosts = [...this.posts];
                break;
        }
        
        // If search term exists, apply it to filtered posts
        if (this.searchInput && this.searchInput.value.trim()) {
            const searchTerm = this.searchInput.value.trim().toLowerCase();
            filteredPosts = filteredPosts.filter(post => {
                const title = (post.title || '').toLowerCase();
                const content = (post.content || '').toLowerCase();
                const tags = (post.tags || []).join(' ').toLowerCase();
                
                return title.includes(searchTerm) || 
                       content.includes(searchTerm) || 
                       tags.includes(searchTerm);
            });
        }
        
        // Temporarily replace posts array for rendering
        const originalPosts = this.posts;
        this.posts = filteredPosts;
        this.renderPosts();
        this.posts = originalPosts;
    }
    
    /**
     * Search posts by keywords
     */
    searchPosts() {
        this.filterPosts();
    }
    
    /**
     * Create a new blog post
     */
    createNewPost() {
        this.isEditMode = false;
        this.currentPost = {
            title: '',
            content: '',
            excerpt: '',
            slug: '',
            author: 'Gabi',
            tags: [],
            published: false,
            images: []
        };
        
        // Reset form fields
        if (this.postTitle) this.postTitle.value = '';
        if (this.postSlug) this.postSlug.value = '';
        if (this.postExcerpt) this.postExcerpt.value = '';
        if (this.postContent) this.postContent.value = '';
        if (this.postAuthor) this.postAuthor.value = 'Gabi';
        if (this.postTags) this.postTags.value = '';
        if (this.featuredImageAlt) this.featuredImageAlt.value = '';
        
        // Reset featured image
        this.removeFeaturedImage();
        
        // Update UI
        if (this.editorTitle) {
            this.editorTitle.textContent = 'Create New Post';
        }
        
        if (this.editorStatus) {
            this.editorStatus.textContent = 'Draft';
            this.editorStatus.classList.remove('published');
        }
        
        // Hide blog images container
        if (this.blogImagesContainer) {
            this.blogImagesContainer.style.display = 'none';
        }
        if (this.blogImagesGallery) {
            this.blogImagesGallery.innerHTML = '';
        }
        
        this.showEditorPanel();
    }
    
    /**
     * Edit an existing blog post
     */
    async editPost(postId) {
        try {
            this.showLoadingOverlay();
            
            // Find post from cached posts first
            let post = this.posts.find(p => p._id === postId);
            
            // If not found in cache, fetch from API
            if (!post) {
                const response = await fetch(`/api/blog/posts/${postId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to load blog post');
                }
                
                const data = await response.json();
                post = data.post;
            }
            
            if (!post) {
                throw new Error('Post not found');
            }
            
            this.isEditMode = true;
            this.currentPost = post;
            
            // Fill form fields
            if (this.postTitle) this.postTitle.value = post.title || '';
            if (this.postSlug) this.postSlug.value = post.slug || '';
            if (this.postExcerpt) this.postExcerpt.value = post.excerpt || '';
            if (this.postContent) this.postContent.value = post.content || '';
            if (this.postAuthor) this.postAuthor.value = post.author || 'Gabi';
            if (this.postTags) this.postTags.value = post.tags ? post.tags.join(', ') : '';
            
            // Set featured image if exists
            if (post.coverImage && post.coverImage.url) {
                console.log('Post has cover image:', post.coverImage);
                
                // Check if we have a valid URL
                let coverImageUrl = post.coverImage.url;
                
                // If URL is relative and doesn't start with a data URL indicator,
                // make sure it's properly formed
                if (!coverImageUrl.startsWith('data:') && !coverImageUrl.startsWith('http')) {
                    // Make sure URL starts with a slash
                    if (!coverImageUrl.startsWith('/')) {
                        coverImageUrl = '/' + coverImageUrl;
                    }
                }
                
                this.setFeaturedImage(coverImageUrl);
                if (this.featuredImageAlt) {
                    this.featuredImageAlt.value = post.coverImage.alt || '';
                }
            } else {
                this.removeFeaturedImage();
            }
            
            // Update UI
            if (this.editorTitle) {
                this.editorTitle.textContent = 'Edit Post';
            }
            
            if (this.editorStatus) {
                this.editorStatus.textContent = post.published ? 'Published' : 'Draft';
                if (post.published) {
                    this.editorStatus.classList.add('published');
                } else {
                    this.editorStatus.classList.remove('published');
                }
            }
            
            // Show blog images if any
            if (post.images && post.images.length > 0 && this.blogImagesContainer) {
                this.blogImagesContainer.style.display = '';
                this.renderBlogImages(post.images);
            } else if (this.blogImagesContainer) {
                this.blogImagesContainer.style.display = 'none';
            }
            
            this.showEditorPanel();
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Error editing post:', error);
            this.showNotification('Failed to load post for editing. Please try again.', 'error');
            this.hideLoadingOverlay();
        }
    }
    
    /**
     * Render blog images in the editor
     */
    renderBlogImages(images) {
        if (!this.blogImagesGallery) return;
        
        this.blogImagesGallery.innerHTML = '';
        
        images.forEach(image => {
            const imgItem = document.createElement('div');
            imgItem.className = 'blog-image-item';
            
            const imageAlt = image.alt || '';
            const imageCaption = image.caption || '';
            
            imgItem.innerHTML = `
                <img src="${image.url}" alt="${imageAlt}">
                ${imageAlt ? `<div class="blog-image-info">${imageAlt}</div>` : ''}
                <div class="blog-image-actions">
                    <button title="Insert into post" class="insert-image" data-url="${image.url}" data-alt="${imageAlt}">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button title="Edit image details" class="edit-image" data-url="${image.url}" data-alt="${imageAlt}" data-caption="${imageCaption}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button title="Remove from post" class="delete-image" data-url="${image.url}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            this.blogImagesGallery.appendChild(imgItem);
            
            // Image thumbnail click inserts the image directly
            const imgElement = imgItem.querySelector('img');
            if (imgElement) {
                imgElement.addEventListener('click', () => {
                    const url = image.url;
                    const alt = imageAlt;
                    this.insertImage(url, alt);
                    this.showNotification('Image inserted into content at cursor position');
                });
            }
            
            // Add event listeners for action buttons
            const insertBtn = imgItem.querySelector('.insert-image');
            if (insertBtn) {
                insertBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent bubbling to the image click
                    const url = insertBtn.dataset.url;
                    const alt = insertBtn.dataset.alt || '';
                    this.insertImage(url, alt);
                    this.showNotification('Image inserted into content at cursor position');
                });
            }
            
            const editBtn = imgItem.querySelector('.edit-image');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent bubbling to the image click
                    const url = editBtn.dataset.url;
                    const alt = editBtn.dataset.alt || '';
                    const caption = editBtn.dataset.caption || '';
                    this.editImageDetails(url, alt, caption);
                });
            }
            
            const deleteBtn = imgItem.querySelector('.delete-image');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent bubbling to the image click
                    const url = deleteBtn.dataset.url;
                    this.removeImageFromPost(url);
                });
            }
        });
    }
    
    /**
     * Remove an image from the post
     */
    removeImageFromPost(imageUrl) {
        if (!this.currentPost || !this.currentPost.images) return;
        
        const confirmRemove = window.confirm('Are you sure you want to remove this image from the post?');
        if (!confirmRemove) return;
        
        this.currentPost.images = this.currentPost.images.filter(img => img.url !== imageUrl);
        
        // Update UI
        this.renderBlogImages(this.currentPost.images);
        
        // Hide container if no images left
        if (this.currentPost.images.length === 0 && this.blogImagesContainer) {
            this.blogImagesContainer.style.display = 'none';
        }
        
        this.showNotification('Image removed from post.');
    }
    
    /**
     * Edit image alt text and caption
     */
    editImageDetails(imageUrl, currentAlt, currentCaption) {
        // Simple edit dialog using prompt (could be replaced with a modal later)
        const newAlt = prompt('Enter alt text for accessibility:', currentAlt || '');
        
        if (newAlt === null) return; // User cancelled
        
        const newCaption = prompt('Enter caption (optional):', currentCaption || '');
        
        // Find image in array and update details
        if (this.currentPost && this.currentPost.images) {
            const imageIndex = this.currentPost.images.findIndex(img => img.url === imageUrl);
            
            if (imageIndex !== -1) {
                this.currentPost.images[imageIndex].alt = newAlt;
                this.currentPost.images[imageIndex].caption = newCaption !== null ? newCaption : '';
                
                // Update display
                this.renderBlogImages(this.currentPost.images);
                this.showNotification('Image details updated.');
            }
        }
    }
    
    /**
     * Save the current blog post
     */
    async savePost(publish = false) {
        if (!this.currentPost) return;
        
        try {
            // Validate required fields
            if (!this.postTitle.value.trim()) {
                this.showNotification('Post title is required.', 'error');
                this.postTitle.focus();
                return;
            }
            
            this.showLoadingOverlay();
            
            // Get form values
            const postData = {
                title: this.postTitle.value.trim(),
                slug: this.postSlug.value.trim() || this.generateSlug(this.postTitle.value.trim()),
                excerpt: this.postExcerpt.value.trim(),
                content: this.postContent.value,
                author: this.postAuthor.value.trim() || 'Gabi',
                tags: this.postTags.value ? this.postTags.value.split(',').map(tag => tag.trim()) : [],
                published: publish
            };
            
            // Add featured image if exists
            if (this.featuredImagePreview && this.featuredImagePreview.src && 
                this.featuredImagePreview.style.display !== 'none') {
                
                postData.coverImage = {
                    url: this.featuredImagePreview.src,
                    alt: this.featuredImageAlt ? this.featuredImageAlt.value : ''
                };
            }
            
            // Add existing images if any
            if (this.currentPost.images && this.currentPost.images.length > 0) {
                postData.images = this.currentPost.images;
            }
            
            // Get authentication token
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }
            
            let response;
            
            if (this.isEditMode && this.currentPost._id) {
                // Update existing post
                response = await fetch(`/api/blog/posts/${this.currentPost._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(postData)
                });
            } else {
                // Create new post
                response = await fetch('/api/blog/posts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(postData)
                });
            }
            
            if (!response.ok) {
                throw new Error(`Failed to save post: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Update current post with returned data
            this.currentPost = data.post;
            
            // Refresh posts list
            await this.loadPosts();
            
            // Show success message
            const action = this.isEditMode ? 'updated' : 'created';
            const status = publish ? 'published' : 'saved as draft';
            this.showNotification(`Post ${action} and ${status} successfully!`);
            
            // Go back to posts list
            this.showBlogPanel();
        } catch (error) {
            console.error('Error saving post:', error);
            this.showNotification(`Error saving post: ${error.message}`, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    /**
     * Generate a URL-friendly slug from a string
     */
    generateSlug(text) {
        return text.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/-+/g, '-')      // Replace multiple - with single -
            .trim();                  // Trim whitespace
    }
    
    /**
     * Update slug field based on the title
     */
    updateSlugFromTitle() {
        if (!this.postTitle || !this.postSlug) return;
        
        // Only auto-generate if slug is empty or hasn't been manually edited
        if (!this.postSlug.value.trim() || 
            this.postSlug.value.trim() === this.generateSlug(this.currentPost?.title || '')) {
            
            this.postSlug.value = this.generateSlug(this.postTitle.value.trim());
        }
    }
    
    /**
     * Preview the current post
     */
    previewPost() {
        if (!this.postTitle.value.trim()) {
            this.showNotification('Post title is required for preview.', 'error');
            this.postTitle.focus();
            return;
        }
        
        if (!this.previewModal) return;
        
        // Set preview content
        if (this.previewTitle) {
            this.previewTitle.textContent = this.postTitle.value || 'Untitled Post';
        }
        
        if (this.previewAuthor) {
            this.previewAuthor.textContent = this.postAuthor.value || 'Gabi';
        }
        
        if (this.previewDate) {
            this.previewDate.textContent = new Date().toLocaleDateString();
        }
        
        if (this.previewContent) {
            // Convert markdown to HTML using marked library
            if (window.marked) {
                this.previewContent.innerHTML = window.marked.parse(this.postContent.value || '');
            } else {
                this.previewContent.textContent = this.postContent.value || '';
            }
        }
        
        // Show modal
        this.previewModal.classList.add('show');
    }
    
    /**
     * Close the preview modal
     */
    closePreviewModal() {
        if (!this.previewModal) return;
        this.previewModal.classList.remove('show');
    }
    
    /**
     * Show the editor panel
     */
    showEditorPanel() {
        if (this.blogPanel) {
            this.blogPanel.classList.remove('active');
        }
        
        if (this.editorPanel) {
            this.editorPanel.classList.add('active');
        }
    }
    
    /**
     * Show the blog panel
     */
    showBlogPanel() {
        if (this.editorPanel) {
            this.editorPanel.classList.remove('active');
        }
        
        if (this.blogPanel) {
            this.blogPanel.classList.add('active');
        }
        
        // Reset current post
        this.currentPost = null;
    }
    
    /**
     * View a published post
     */
    viewPost(postId) {
        console.log('View post clicked:', postId);
        const post = this.posts.find(p => p._id === postId);
        if (!post) {
            console.error('Post not found:', postId);
            this.showNotification('Post not found.', 'error');
            return;
        }
        
        console.log('Post found:', post);
        
        if (!post.published) {
            console.log('Post not published, showing preview instead');
            this.showNotification('This post is not published yet. Use Preview instead.', 'error');
            return;
        }
        
        // Open post in a new tab
        const url = `/blog.html?post=${post.slug}`;
        console.log('Opening URL:', url);
        window.open(url, '_blank');
    }
    
    /**
     * Confirm deletion of a post
     */
    confirmDeletePost(postId) {
        const post = this.posts.find(p => p._id === postId);
        if (!post) return;
        
        this.postToDelete = post;
        
        if (this.deletePostTitle) {
            this.deletePostTitle.textContent = `"${post.title || 'Untitled Post'}"`;
        }
        
        if (this.deleteModal) {
            this.deleteModal.classList.add('show');
        }
    }
    
    /**
     * Close the delete confirmation modal
     */
    closeDeleteModal() {
        if (!this.deleteModal) return;
        this.deleteModal.classList.remove('show');
        this.postToDelete = null;
    }
    
    /**
     * Delete the selected post
     */
    async deleteSelectedPost() {
        if (!this.postToDelete) return;
        
        try {
            this.closeDeleteModal();
            this.showLoadingOverlay();
            
            // Get authentication token
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication required. Please log in again.');
            }
            
            // Delete from API
            const response = await fetch(`/api/blog/posts/${this.postToDelete._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete post: ${response.statusText}`);
            }
            
            // Remove from local posts array
            this.posts = this.posts.filter(post => post._id !== this.postToDelete._id);
            
            // Update UI
            this.renderPosts();
            this.showNotification('Post deleted successfully.');
            
            // Clear post to delete
            this.postToDelete = null;
        } catch (error) {
            console.error('Error deleting post:', error);
            this.showNotification(`Error deleting post: ${error.message}`, 'error');
        } finally {
            this.hideLoadingOverlay();
        }
    }
    
    /**
     * Set the featured image
     */
    setFeaturedImage(imageUrl) {
        if (!this.featuredImagePreview || !this.featuredImagePlaceholder) return;
        
        // Make sure we have a valid image URL or data URL
        if (!imageUrl) {
            console.error('Invalid image URL provided to setFeaturedImage');
            this.showNotification('Failed to set image. Invalid image data.', 'error');
            return;
        }
        
        console.log('Setting featured image with URL:', imageUrl);
        
        // Remove previous error handler before setting new src to prevent recursion
        this.featuredImagePreview.onerror = null;
        
        // Set up the onload handler
        this.featuredImagePreview.onload = () => {
            console.log('Featured image loaded successfully');
            // Show the preview once image is loaded
            this.featuredImagePreview.style.display = '';
            this.featuredImagePlaceholder.style.display = 'none';
            
            if (this.removeFeaturedImageBtn) {
                this.removeFeaturedImageBtn.style.display = '';
            }
        };
        
        // Process different types of URLs appropriately
        let processedUrl = imageUrl;
        
        // Handle blog-specific URLs
        if (imageUrl.startsWith('/uploads/blog/')) {
            // For local development, convert relative paths to absolute paths if needed
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                const base = window.location.origin;
                processedUrl = `${base}${imageUrl}`;
            }
        } else if (imageUrl.includes('/api/gallery/')) {
            // For gallery images, fetch the actual image data
            this.showLoadingOverlay();
            
            // Fetch the image data and create a blob URL
            fetch(imageUrl)
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load image data');
                    return response.blob();
                })
                .then(blob => {
                    // Clean up any previous object URL
                    if (this._previousFeaturedImageObjectUrl) {
                        URL.revokeObjectURL(this._previousFeaturedImageObjectUrl);
                    }
                    
                    // Create new object URL
                    const objectUrl = URL.createObjectURL(blob);
                    
                    // Store for later cleanup
                    this._previousFeaturedImageObjectUrl = objectUrl;
                    
                    // Set the image source
                    this.featuredImagePreview.src = objectUrl;
                    
                    this.hideLoadingOverlay();
                })
                .catch(error => {
                    console.error('Error loading gallery image:', error);
                    this.showNotification('Failed to load featured image. Please set it again.', 'error');
                    this.removeFeaturedImage();
                    this.hideLoadingOverlay();
                });
            
            return; // Skip the default src setting below as we're handling it in the fetch
        }
        
        // Set up error handler after a small delay to avoid potential race conditions
        setTimeout(() => {
            this.featuredImagePreview.onerror = (e) => {
                console.error('Failed to load image in preview', e);
                // Prevent recursive notifications by removing the handler immediately
                this.featuredImagePreview.onerror = null;
                
                // Show notification only once
                this.showNotification('Failed to load image preview. Please try again.', 'error');
                
                // Safely clean up the image
                this.removeFeaturedImage();
            };
        }, 0);
        
        // Use the processed URL for the image source
        this.featuredImagePreview.src = processedUrl;
    }
    
    /**
     * Remove the featured image
     */
    removeFeaturedImage() {
        if (!this.featuredImagePreview || !this.featuredImagePlaceholder) return;
        
        this.featuredImagePreview.src = '';
        this.featuredImagePreview.style.display = 'none';
        this.featuredImagePlaceholder.style.display = '';
        
        if (this.removeFeaturedImageBtn) {
            this.removeFeaturedImageBtn.style.display = 'none';
        }
        
        if (this.featuredImageAlt) {
            this.featuredImageAlt.value = '';
        }
    }
    
    /**
     * Handle featured image file upload
     */
    async handleFeaturedImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate if it's an image file
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please select a valid image file.', 'error');
            if (this.featuredImageUpload) {
                this.featuredImageUpload.value = '';
            }
            return;
        }
        
        try {
            this.showLoadingOverlay();
            
            // Process the image with appropriate compression
            const imageData = await this.processImage(file);
            
            // Get image dimensions
            const dimensions = await this.getImageDimensions(imageData);
            
            // Store image metadata for later use
            const imageMetadata = {
                originalName: file.name,
                fileType: file.type,
                dimensions: dimensions,
                size: this.getDataUrlSize(imageData)
            };
            
            console.log(`Featured image processed: ${file.name} (${dimensions.width}x${dimensions.height}, ${this.formatFileSize(imageMetadata.size)})`);
            
            // Set as featured image with metadata
            this.setFeaturedImage(imageData, imageMetadata);
            
            this.showNotification('Featured image uploaded successfully!');
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Error processing image:', error);
            this.showNotification('Failed to process image. Please try again.', 'error');
            this.hideLoadingOverlay();
        }
            
            // Reset file input
            if (this.featuredImageUpload) {
                this.featuredImageUpload.value = '';
            }
        }
    
    /**
     * Load images from the gallery
     */
    async loadImages() {
        try {
            // Fetch images from API
            const response = await fetch('/api/gallery/images');
            
            if (!response.ok) {
                throw new Error('Failed to load gallery images');
            }
            
            const data = await response.json();
            this.images = data.images || [];
        } catch (error) {
            console.error('Error loading gallery images:', error);
            this.images = [];
        }
    }
    
    /**
     * Open the image selection modal
     */
    openImageSelectionModal(purpose) {
        if (!this.imageModal || !this.imageGallery) return;
        
        // Store the purpose for later use
        this.imageInsertCallback = purpose;
        this.selectedImage = null;
        
        // Clear selection
        const selectedItems = this.imageGallery.querySelectorAll('.selected');
        selectedItems.forEach(item => item.classList.remove('selected'));
        
        // Render gallery images
        this.renderGalleryImages();
        
        // Show modal
        this.imageModal.classList.add('show');
        this.imageModal.style.display = 'flex';
        this.selectImageBtn.disabled = true;
    }
    
    /**
     * Render images in the gallery selection modal
     */
    renderGalleryImages() {
        console.log('Rendering gallery images:', this.images)
        if (!this.imageGallery) return;
        
        // Clear gallery
        this.imageGallery.innerHTML = '';
        
        if (this.images.length === 0) {
            this.imageGallery.innerHTML = '<p>No images available. Upload a new image.</p>';
            return;
        }
        
        // Add images to gallery
        this.images.forEach(image => {
            console.log('Rendering image:', image)
            const imgItem = document.createElement('div');
            imgItem.className = 'gallery-image-item';
            imgItem.dataset.id = image.image_id;
            imgItem.dataset.url = `/api/gallery/images/${image.image_id}/data`;
            imgItem.dataset.alt = image.alt_text || '';
            
            // Try to use thumbnail if available, otherwise use full image
            const imgSrc = image.thumbnail_url || `/api/gallery/images/${image.image_id}/data`;
            
            imgItem.innerHTML = `<img src="${imgSrc}" alt="${image.alt_text || ''}">`;
            
            this.imageGallery.appendChild(imgItem);
            console.log('Image item added:', imgItem)
            // Add click event
            imgItem.addEventListener('click', () => {
                console.log('Image clicked:', image)
                // Remove selected class from all items
                this.imageGallery.querySelectorAll('.gallery-image-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selected class to this item
                imgItem.classList.add('selected');
                
                // Store selected image
                this.selectedImage = {
                    id: image.image_id,
                    url: `/api/gallery/images/${image.image_id}/data`,
                    alt: image.alt_text || ''
                };
                
                // Enable select button
                this.selectImageBtn.disabled = false;
            });
        });
    }
    
    /**
     * Close the image selection modal
     */
    closeImageModal() {
        if (!this.imageModal) return;
        this.imageModal.classList.remove('show');
        this.imageModal.style.display = 'none';
        this.imageInsertCallback = null;
        this.selectedImage = null;
    }
    
    /**
     * Handle drag over event for image upload
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.imageUploadZone) {
            this.imageUploadZone.classList.add('dragover');
        }
    }
    
    /**
     * Handle image drop event
     */
    async handleImageDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.imageUploadZone) {
            this.imageUploadZone.classList.remove('dragover');
        }
        
        const files = e.dataTransfer.files;
        if (!files.length) return;
        
        await this.processUploadedImage(files[0]);
    }
    
    /**
     * Handle image file select from input
     */
    async handleImageFileSelect(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        for (let i = 0; i < files.length; i++) {
            await this.processUploadedImage(files[i]);
        }
        
        // Reset file input
        if (this.imageFileInput) {
            this.imageFileInput.value = '';
        }
    }
    
    /**
     * Process an uploaded image file
     */
    async processUploadedImage(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Only image files are accepted.', 'error');
            return;
        }
        
        try {
            this.showLoadingOverlay();
            
            // Process image
            const imageData = await this.processImage(file);
            
        // Upload to server using blog-specific endpoint
        const token = localStorage.getItem('auth_token');
        if (!token) {
            throw new Error('Authentication required. Please log in again.');
        }
        
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/blog/images/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Add to local images array
        this.images.unshift({
            image_id: Date.now(), // Generate a temporary ID
            title: file.name.replace(/\.[^/.]+$/, ""), // Filename without extension
            alt_text: '',
            url: data.url,
            thumbnail_url: data.url
        });
            
            // Render gallery images
            this.renderGalleryImages();
            
            // Select the newly uploaded image
            const firstItem = this.imageGallery.querySelector('.gallery-image-item');
            if (firstItem) {
                firstItem.click();
            }
            
            this.showNotification('Image uploaded successfully!');
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Error processing uploaded image:', error);
            this.showNotification(`Error uploading image: ${error.message}`, 'error');
            this.hideLoadingOverlay();
        }
    }
    
    /**
     * Select and insert the selected image
     */
    async selectAndInsertImage() {
        if (!this.selectedImage) {
            this.showNotification('Please select an image first.', 'error');
            return;
        }
        
        try {
            this.showLoadingOverlay();
            
            // Get image URL (could be direct URL or gallery URL)
            let imageUrl = this.selectedImage.url;
            
            // If it's a gallery URL, we need to load the blob and create an object URL
            if (imageUrl.startsWith('/api/gallery/')) {
                const response = await fetch(imageUrl);
                
                if (!response.ok) {
                    throw new Error('Failed to load image data');
                }
                
                const blob = await response.blob();
                imageUrl = URL.createObjectURL(blob);
            }
            
            // Different handling based on where the image is being inserted
            if (this.imageInsertCallback === 'featured') {
                // Set as featured image
                this.setFeaturedImage(imageUrl);
                
                // Set alt text if available
                if (this.featuredImageAlt && this.selectedImage.alt) {
                    this.featuredImageAlt.value = this.selectedImage.alt;
                }
                
                this.showNotification('Featured image set successfully!');
            } else if (this.imageInsertCallback === 'content') {
                // Insert at cursor position in Quill editor
                this.insertImage(imageUrl, this.selectedImage.alt || '');
                this.showNotification('Image inserted into content!');
            }
            
            // Close the modal
            this.closeImageModal();
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Error selecting and inserting image:', error);
            this.showNotification('Failed to insert image. Please try again.', 'error');
            this.hideLoadingOverlay();
        }
    }
    
    /**
     * Process image for compression
     */
    async processImage(imageFile) {
        if (!imageFile) {
            throw new Error('No image file provided');
        }
        
        // Make a copy of the options
        const options = { ...this.imageOptions };
        
        // Use higher quality for featured images
        try {
            if (this.imageInsertCallback === 'featured') {
                options.initialQuality = 0.85;
            }
        } catch (error) {
            console.error('Error selecting and inserting image:', error);
            // Fall back to reading the original file
            return await this.readFileAsDataURL(imageFile);
        }
        
        // Don't compress GIFs (to preserve animation)
        if (imageFile.type === 'image/gif') {
            return this.readFileAsDataURL(imageFile);
        }
        
        try {
            // Check if the image compression library is available
            if (typeof imageCompression !== 'undefined') {
                const compressedFile = await imageCompression(imageFile, options);
                console.log(`Image compressed: ${this.formatFileSize(imageFile.size)} → ${this.formatFileSize(compressedFile.size)}`);
                return await this.readFileAsDataURL(compressedFile);
            } else {
                console.warn('Image compression library not available, using original image');
                return await this.readFileAsDataURL(imageFile);
            }
        } catch (error) {
            console.error('Image compression failed:', error);
            // Fall back to reading the original file
            return await this.readFileAsDataURL(imageFile);
        }
    }
    
    /**
     * Format file size to readable string
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Get image dimensions
     */
    getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            
            img.onerror = (error) => {
                reject(error);
            };
            
            img.src = dataUrl;
        });
    }
    
    /**
     * Calculate the approximate size of a data URL in bytes
     */
    getDataUrlSize(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        return base64 ? Math.floor(base64.length * 0.75) : 0;
    }
    
    /**
     * Read a file as data URL
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
     * Show loading overlay
     */
    showLoadingOverlay() {
        // Create or show loading overlay
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }
    
    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    
    /**
     * Show notification
     */
    showNotification(message, type = 'success') {
        // Check if notification container exists
        let notificationContainer = document.querySelector('.notification-container');
        
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        
        // Add notification to container
        notificationContainer.appendChild(notification);
            
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                notification.remove();
                
                // Remove container if empty
                if (notificationContainer.children.length === 0) {
                    notificationContainer.remove();
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Show delete confirmation modal
     */
    showDeleteConfirmation(postId) {
        const post = this.posts.find(p => p._id === postId);
        if (!post || !this.deleteModal || !this.deletePostTitle) return;
        
        this.postToDelete = postId;
        this.deletePostTitle.textContent = post.title || 'Untitled Post';
        this.deleteModal.style.display = 'flex';
        
        // Add classes for animation
        setTimeout(() => {
            this.deleteModal.classList.add('show');
            const modalContent = this.deleteModal.querySelector('.admin-modal-content');
            if (modalContent) modalContent.classList.add('show');
        }, 10);
    }
    
    /**
     * Edit an existing blog post
     */
    async editPost(postId) {
        try {
            this.showLoadingOverlay();
            
            // Find post from cached posts first
            let post = this.posts.find(p => p._id === postId);
            
            // If not found in cache, fetch from API
            if (!post) {
                const response = await fetch(`/api/blog/posts/${postId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to load blog post');
                }
                
                const data = await response.json();
                post = data.post;
            }
            
            if (!post) {
                throw new Error('Post not found');
            }
            
            this.isEditMode = true;
            this.currentPost = post;
            
            // Fill form fields
            if (this.postTitle) this.postTitle.value = post.title || '';
            if (this.postSlug) this.postSlug.value = post.slug || '';
            if (this.postExcerpt) this.postExcerpt.value = post.excerpt || '';
            if (this.postContent) this.postContent.value = post.content || '';
            if (this.postAuthor) this.postAuthor.value = post.author || 'Gabi';
            if (this.postTags) this.postTags.value = post.tags ? post.tags.join(', ') : '';
            
            // Set featured image if exists
            if (post.coverImage && post.coverImage.url) {
                console.log('Post has cover image:', post.coverImage);
                
                // Check if we have a valid URL
                let coverImageUrl = post.coverImage.url;
                
                // If URL is relative and doesn't start with a data URL indicator,
                // make sure it's properly formed
                if (!coverImageUrl.startsWith('data:') && !coverImageUrl.startsWith('http')) {
                    // Make sure URL starts with a slash
                    if (!coverImageUrl.startsWith('/')) {
                        coverImageUrl = '/' + coverImageUrl;
                    }
                }
                
                this.setFeaturedImage(coverImageUrl);
                if (this.featuredImageAlt) {
                    this.featuredImageAlt.value = post.coverImage.alt || '';
                }
            } else {
                this.removeFeaturedImage();
            }
            
            // Update UI
            if (this.editorTitle) {
                this.editorTitle.textContent = 'Edit Post';
            }
            
            if (this.editorStatus) {
                this.editorStatus.textContent = post.published ? 'Published' : 'Draft';
                if (post.published) {
                    this.editorStatus.classList.add('published');
                } else {
                    this.editorStatus.classList.remove('published');
                }
            }
            
            // Show blog images if any
            if (post.images && post.images.length > 0 && this.blogImagesContainer) {
                this.blogImagesContainer.style.display = '';
                this.renderBlogImages(post.images);
            } else if (this.blogImagesContainer) {
                this.blogImagesContainer.style.display = 'none';
            }
            
            this.showEditorPanel();
            this.hideLoadingOverlay();
        } catch (error) {
            console.error('Error editing post:', error);
            this.showNotification('Failed to load post for editing. Please try again.', 'error');
            this.hideLoadingOverlay();
        }
    }
}
