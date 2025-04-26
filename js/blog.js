/**
 * Blog Frontend Script
 * Handles blog post loading, display, and interaction on the public blog pages
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the blog manager
    const blogManager = new BlogManager();
    blogManager.init();
});

/**
 * BlogManager Class
 * Manages all blog frontend functionality
 */
class BlogManager {
    constructor() {
        // DOM elements
        this.postsContainer = document.getElementById('blog-posts-list');
        this.paginationContainer = document.getElementById('blog-pagination');
        this.recentPostsList = document.getElementById('recent-posts');
        this.tagsContainer = document.getElementById('blog-tags');
        this.searchInput = document.getElementById('blog-search');
        this.searchButton = document.getElementById('blog-search-btn');
        this.singlePostTemplate = document.getElementById('single-post-template');
        
        // State
        this.currentPage = 1;
        this.postsPerPage = 5;
        this.totalPages = 1;
        this.searchTerm = '';
        this.currentTag = '';
        this.singlePostMode = false;
        this.currentPost = null;
        
        // Parse URL parameters
        this.parseUrlParams();
        
        // Bind event handlers
        this.bindEvents();
    }
    
    /**
     * Initialize the blog manager
     */
    async init() {
        try {
            // Check if we're in single post mode
            if (this.singlePostMode && this.currentPost) {
                // Load and display single post
                await this.loadAndDisplaySinglePost(this.currentPost);
            } else {
                // Load blog posts
                await this.loadPosts();
                
                // Load sidebar data
                await Promise.all([
                    this.loadRecentPosts(),
                    this.loadTags()
                ]);
            }
        } catch (error) {
            console.error('Error initializing blog:', error);
            this.showErrorMessage('Failed to load blog content. Please try again later.');
        }
    }
    
    /**
     * Parse URL parameters
     */
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check for post slug parameter
        const postSlug = urlParams.get('post');
        if (postSlug) {
            this.singlePostMode = true;
            this.currentPost = postSlug;
            
            // Hide regular blog layout and show single post template
            if (this.postsContainer) {
                const blogContainer = document.querySelector('.blog-container');
                if (blogContainer) {
                    blogContainer.style.display = 'none';
                }
            }
            
            if (this.singlePostTemplate) {
                this.singlePostTemplate.style.display = '';
            }
        }
        
        // Check for page parameter
        const page = urlParams.get('page');
        if (page && !isNaN(parseInt(page))) {
            this.currentPage = parseInt(page);
        }
        
        // Check for tag parameter
        const tag = urlParams.get('tag');
        if (tag) {
            this.currentTag = tag;
        }
        
        // Check for search parameter
        const search = urlParams.get('search');
        if (search) {
            this.searchTerm = search;
            if (this.searchInput) {
                this.searchInput.value = search;
            }
        }
    }
    
    /**
     * Bind event handlers
     */
    bindEvents() {
        // Search form
        if (this.searchButton) {
            this.searchButton.addEventListener('click', () => this.handleSearch());
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }
        
        // Social sharing in single post view
        const shareFacebook = document.getElementById('share-facebook');
        const shareTwitter = document.getElementById('share-twitter');
        const sharePinterest = document.getElementById('share-pinterest');
        
        if (shareFacebook) {
            shareFacebook.addEventListener('click', (e) => {
                e.preventDefault();
                this.shareSocial('facebook');
            });
        }
        
        if (shareTwitter) {
            shareTwitter.addEventListener('click', (e) => {
                e.preventDefault();
                this.shareSocial('twitter');
            });
        }
        
        if (sharePinterest) {
            sharePinterest.addEventListener('click', (e) => {
                e.preventDefault();
                this.shareSocial('pinterest');
            });
        }
    }
    
    /**
     * Load and display blog posts
     */
    async loadPosts() {
        if (!this.postsContainer) return;
        
        try {
            // Show loading state
            this.postsContainer.innerHTML = `
                <div class="blog-loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading posts...
                </div>
            `;
            
            // Build query parameters
            let queryParams = `?page=${this.currentPage}&limit=${this.postsPerPage}&published=true`;
            
            if (this.searchTerm) {
                queryParams += `&search=${encodeURIComponent(this.searchTerm)}`;
            }
            
            if (this.currentTag) {
                queryParams += `&tag=${encodeURIComponent(this.currentTag)}`;
            }
            
            // Fetch posts from API
            const response = await fetch(`/api/blog/posts${queryParams}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch posts');
            }
            
            const data = await response.json();
            
            // Handle empty posts array
            if (!data.posts || data.posts.length === 0) {
                this.showNoPosts();
                return;
            }
            
            // Update pagination state
            this.totalPages = data.pagination.pages;
            
            // Render posts
            this.renderPosts(data.posts);
            
            // Render pagination if there are multiple pages
            if (this.totalPages > 1) {
                this.renderPagination();
            } else {
                this.paginationContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showErrorMessage('Failed to load posts. Please try again later.');
        }
    }
    
    /**
     * Show "no posts found" message
     */
    showNoPosts() {
        this.postsContainer.innerHTML = `
            <div class="no-posts-message">
                <h3>No posts found</h3>
                <p>${this.searchTerm ? 'No results match your search criteria.' : 'Check back soon for new content!'}</p>
                ${this.searchTerm || this.currentTag ? '<a href="blog.html" class="btn-small">View all posts</a>' : ''}
            </div>
        `;
        
        // Clear pagination
        if (this.paginationContainer) {
            this.paginationContainer.innerHTML = '';
        }
    }
    
    /**
     * Show error message
     */
    showErrorMessage(message) {
        if (this.postsContainer) {
            this.postsContainer.innerHTML = `
                <div class="no-posts-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <a href="blog.html" class="btn-small">Try again</a>
                </div>
            `;
        }
    }
    
    /**
     * Render blog posts
     */
    renderPosts(posts) {
        if (!this.postsContainer) return;
        
        // Clear container
        this.postsContainer.innerHTML = '';
        
        // Add posts
        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            this.postsContainer.appendChild(postElement);
        });
    }
    
    /**
     * Create post element
     */
    createPostElement(post) {
        const postElement = document.createElement('article');
        postElement.className = 'blog-post-card';
        
        // Format date
        const postDate = post.publishedAt 
            ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
            : new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        
        // Generate tags HTML if there are tags
        let tagsHtml = '';
        if (post.tags && post.tags.length > 0) {
            tagsHtml = `
                <div class="blog-post-tags">
                    ${post.tags.map(tag => 
                        `<a href="blog.html?tag=${encodeURIComponent(tag)}" class="blog-tag">${tag}</a>`
                    ).join('')}
                </div>
            `;
        }
        
        // Generate featured image if available
        let featuredImageHtml = '';
        if (post.coverImage && post.coverImage.url) {
            featuredImageHtml = `
                <div class="blog-post-image">
                    <img src="${post.coverImage.url}" alt="${post.coverImage.alt || post.title}">
                </div>
            `;
        }
        
        // HTML structure
        postElement.innerHTML = `
            ${featuredImageHtml}
            <div class="blog-post-content">
                <h2><a href="blog.html?post=${post.slug}">${post.title}</a></h2>
                <div class="blog-post-meta">
                    <span class="blog-post-author"><i class="fas fa-user"></i> ${post.author || 'Gabi'}</span>
                    <span class="blog-post-date"><i class="fas fa-calendar"></i> ${postDate}</span>
                </div>
                ${tagsHtml}
                <div class="blog-post-excerpt">
                    ${post.excerpt || this.truncateContent(post.content)}
                </div>
                <a href="blog.html?post=${post.slug}" class="read-more">Read more</a>
            </div>
        `;
        
        return postElement;
    }
    
    /**
     * Truncate content to create excerpt
     */
    truncateContent(content) {
        // Remove any HTML tags
        const strippedContent = content.replace(/<[^>]*>/g, '');
        
        // Return the first 150 characters
        return strippedContent.length > 150 
            ? strippedContent.substring(0, 150) + '...'
            : strippedContent;
    }
    
    /**
     * Render pagination
     */
    renderPagination() {
        if (!this.paginationContainer) return;
        
        // Clear container
        this.paginationContainer.innerHTML = '';
        
        // Create previous button
        const prevButton = document.createElement('button');
        prevButton.className = `pagination-button ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.disabled = this.currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.navigateToPage(this.currentPage - 1);
            }
        });
        
        // Create next button
        const nextButton = document.createElement('button');
        nextButton.className = `pagination-button ${this.currentPage === this.totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.disabled = this.currentPage === this.totalPages;
        nextButton.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.navigateToPage(this.currentPage + 1);
            }
        });
        
        // Add previous button
        this.paginationContainer.appendChild(prevButton);
        
        // Determine which page buttons to show
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(this.totalPages, startPage + 4);
        
        // Adjust start page if end page is too small
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // Add page buttons
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-button ${i === this.currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.navigateToPage(i);
            });
            
            this.paginationContainer.appendChild(pageButton);
        }
        
        // Add next button
        this.paginationContainer.appendChild(nextButton);
    }
    
    /**
     * Navigate to a specific page
     */
    navigateToPage(page) {
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        
        // Preserve other parameters
        if (this.searchTerm) {
            url.searchParams.set('search', this.searchTerm);
        }
        
        if (this.currentTag) {
            url.searchParams.set('tag', this.currentTag);
        }
        
        window.history.pushState({}, '', url);
        
        // Update current page
        this.currentPage = page;
        
        // Load posts for new page
        this.loadPosts();
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    /**
     * Load recent posts for sidebar
     */
    async loadRecentPosts() {
        if (!this.recentPostsList) return;
        
        try {
            // Fetch recent posts from API
            const response = await fetch('/api/blog/posts?limit=5&published=true');
            
            if (!response.ok) {
                throw new Error('Failed to fetch recent posts');
            }
            
            const data = await response.json();
            
            // Handle empty posts array
            if (!data.posts || data.posts.length === 0) {
                this.recentPostsList.innerHTML = '<li>No posts found</li>';
                return;
            }
            
            // Render recent posts
            this.renderRecentPosts(data.posts);
        } catch (error) {
            console.error('Error loading recent posts:', error);
            this.recentPostsList.innerHTML = '<li>Failed to load recent posts</li>';
        }
    }
    
    /**
     * Render recent posts
     */
    renderRecentPosts(posts) {
        if (!this.recentPostsList) return;
        
        // Clear container
        this.recentPostsList.innerHTML = '';
        
        // Add posts
        posts.slice(0, 5).forEach(post => {
            const postDate = post.publishedAt 
                ? new Date(post.publishedAt).toLocaleDateString()
                : new Date(post.createdAt).toLocaleDateString();
            
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <a href="blog.html?post=${post.slug}">
                    ${post.title}
                    <span class="post-date">${postDate}</span>
                </a>
            `;
            
            this.recentPostsList.appendChild(listItem);
        });
    }
    
    /**
     * Load tags for sidebar
     */
    async loadTags() {
        if (!this.tagsContainer) return;
        
        try {
            // Fetch tags from API
            const response = await fetch('/api/blog/tags');
            
            if (!response.ok) {
                throw new Error('Failed to fetch tags');
            }
            
            const data = await response.json();
            
            // Handle empty tags array
            if (!data.tags || data.tags.length === 0) {
                this.tagsContainer.innerHTML = '<p>No categories found</p>';
                return;
            }
            
            // Render tags
            this.renderTags(data.tags);
        } catch (error) {
            console.error('Error loading tags:', error);
            this.tagsContainer.innerHTML = '<p>Failed to load categories</p>';
        }
    }
    
    /**
     * Render tags
     */
    renderTags(tags) {
        if (!this.tagsContainer) return;
        
        // Clear container
        this.tagsContainer.innerHTML = '';
        
        // Add tags
        tags.forEach(tag => {
            const tagLink = document.createElement('a');
            tagLink.href = `blog.html?tag=${encodeURIComponent(tag.tag)}`;
            tagLink.className = 'blog-tag';
            tagLink.textContent = tag.tag;
            
            // Highlight active tag
            if (tag.tag === this.currentTag) {
                tagLink.style.backgroundColor = 'var(--primary-color)';
                tagLink.style.color = '#fff';
            }
            
            this.tagsContainer.appendChild(tagLink);
        });
    }
    
    /**
     * Handle search form submission
     */
    handleSearch() {
        if (!this.searchInput) return;
        
        const searchTerm = this.searchInput.value.trim();
        
        if (searchTerm) {
            // Update URL and navigate
            const url = new URL(window.location);
            url.searchParams.set('search', searchTerm);
            url.searchParams.delete('page'); // Reset to first page
            window.location.href = url.toString();
        }
    }
    
    /**
     * Load and display a single blog post
     */
    async loadAndDisplaySinglePost(slug) {
        try {
            // Show loading state in single post template
            const postTitle = document.getElementById('post-title');
            const postContent = document.getElementById('post-content');
            
            if (postTitle) {
                postTitle.textContent = 'Loading...';
            }
            
            if (postContent) {
                postContent.innerHTML = `
                    <div class="blog-loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading post...
                    </div>
                `;
            }
            
            // Fetch post from API
            const response = await fetch(`/api/blog/posts/slug/${slug}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Post not found');
                }
                throw new Error('Failed to fetch post');
            }
            
            const data = await response.json();
            const post = data.post;
            
            // Update document title
            document.title = `${post.title} - Gabi Yoga Blog`;
            
            // Update meta description
            const metaDescription = document.querySelector('meta[name="description"]');
            if (metaDescription) {
                metaDescription.content = post.excerpt || this.truncateContent(post.content);
            } else {
                const newMetaDescription = document.createElement('meta');
                newMetaDescription.name = 'description';
                newMetaDescription.content = post.excerpt || this.truncateContent(post.content);
                document.head.appendChild(newMetaDescription);
            }
            
            // Format date
            const postDate = post.publishedAt 
                ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : new Date(post.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            
            // Update post title
            if (postTitle) {
                postTitle.textContent = post.title;
            }
            
            // Update post author
            const postAuthor = document.getElementById('post-author');
            if (postAuthor) {
                postAuthor.innerHTML = `<i class="fas fa-user"></i> ${post.author || 'Gabi'}`;
            }
            
            // Update post date
            const postDateElement = document.getElementById('post-date');
            if (postDateElement) {
                postDateElement.innerHTML = `<i class="fas fa-calendar"></i> ${postDate}`;
            }
            
            // Update post tags
            const postTags = document.getElementById('post-tags');
            if (postTags && post.tags && post.tags.length > 0) {
                postTags.innerHTML = post.tags.map(tag => 
                    `<a href="blog.html?tag=${encodeURIComponent(tag)}" class="blog-tag">${tag}</a>`
                ).join('');
            } else if (postTags) {
                postTags.style.display = 'none';
            }
            
            // Update featured image
            const featuredImage = document.getElementById('post-featured-image');
            if (featuredImage) {
                if (post.coverImage && post.coverImage.url) {
                    const img = featuredImage.querySelector('img');
                    if (img) {
                        img.src = post.coverImage.url;
                        img.alt = post.coverImage.alt || post.title;
                        featuredImage.style.display = '';
                    }
                } else {
                    featuredImage.style.display = 'none';
                }
            }
            
            // Update post content
            if (postContent) {
                // Convert markdown to HTML if marked library is available
                if (window.marked) {
                    postContent.innerHTML = window.marked.parse(post.content);
                } else {
                    postContent.textContent = post.content;
                }
            }
            
            // Set up social sharing links
            this.setupSocialSharing(post);
            
            // Load related posts
            await this.loadRelatedPosts(post);
        } catch (error) {
            console.error('Error loading post:', error);
            this.showSinglePostError(error.message);
        }
    }
    
    /**
     * Show error message in single post view
     */
    showSinglePostError(message) {
        const postTitle = document.getElementById('post-title');
        const postContent = document.getElementById('post-content');
        const featuredImage = document.getElementById('post-featured-image');
        const postTags = document.getElementById('post-tags');
        const relatedPosts = document.querySelector('.related-posts');
        
        // Update title
        if (postTitle) {
            postTitle.textContent = 'Error';
        }
        
        // Hide unnecessary elements
        if (featuredImage) featuredImage.style.display = 'none';
        if (postTags) postTags.style.display = 'none';
        if (relatedPosts) relatedPosts.style.display = 'none';
        
        // Show error message
        if (postContent) {
            postContent.innerHTML = `
                <div class="no-posts-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <a href="blog.html" class="btn-small">Back to blog</a>
                </div>
            `;
        }
    }
    
    /**
     * Set up social sharing links
     */
    setupSocialSharing(post) {
        const url = window.location.href;
        const title = post.title;
        const description = post.excerpt || this.truncateContent(post.content);
        
        // Facebook share link
        const shareFacebook = document.getElementById('share-facebook');
        if (shareFacebook) {
            shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        }
        
        // Twitter share link
        const shareTwitter = document.getElementById('share-twitter');
        if (shareTwitter) {
            shareTwitter.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        }
        
        // Pinterest share link
        const sharePinterest = document.getElementById('share-pinterest');
        if (sharePinterest && post.coverImage && post.coverImage.url) {
            sharePinterest.href = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(post.coverImage.url)}&description=${encodeURIComponent(title)}`;
        } else if (sharePinterest) {
            sharePinterest.style.display = 'none';
        }
    }
    
    /**
     * Share post on social media
     */
    shareSocial(platform) {
        const shareLink = document.getElementById(`share-${platform}`);
        if (shareLink && shareLink.href) {
            window.open(shareLink.href, '_blank', 'width=600,height=400');
        }
    }
    
    /**
     * Load related posts
     */
    async loadRelatedPosts(currentPost) {
        const relatedPostsList = document.getElementById('related-posts-list');
        if (!relatedPostsList || !currentPost.tags || currentPost.tags.length === 0) {
            document.querySelector('.related-posts').style.display = 'none';
            return;
        }
        
        try {
            // Use tags to find related posts
            const tag = currentPost.tags[0]; // Use first tag
            
            // Fetch posts with the same tag
            const response = await fetch(`/api/blog/posts?tag=${encodeURIComponent(tag)}&limit=3&published=true`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch related posts');
            }
            
            const data = await response.json();
            const relatedPosts = data.posts.filter(post => post._id !== currentPost._id);
            
            // If no related posts found, hide the section
            if (relatedPosts.length === 0) {
                document.querySelector('.related-posts').style.display = 'none';
                return;
            }
            
            // Render related posts
            this.renderRelatedPosts(relatedPosts);
        } catch (error) {
            console.error('Error loading related posts:', error);
            document.querySelector('.related-posts').style.display = 'none';
        }
    }
    
    /**
     * Render related posts
     */
    renderRelatedPosts(posts) {
        const relatedPostsList = document.getElementById('related-posts-list');
        if (!relatedPostsList) return;
        
        // Clear container
        relatedPostsList.innerHTML = '';
        
        // Add posts
        posts.slice(0, 3).forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'related-post-card';
            
            // Format date
            const postDate = post.publishedAt 
                ? new Date(post.publishedAt).toLocaleDateString()
                : new Date(post.createdAt).toLocaleDateString();
            
            // Generate featured image if available
            let featuredImageHtml = '';
            if (post.coverImage && post.coverImage.url) {
                featuredImageHtml = `
                    <div class="related-post-image">
                        <img src="${post.coverImage.url}" alt="${post.coverImage.alt || post.title}">
                    </div>
                `;
            }
            
            // HTML structure
            postElement.innerHTML = `
                ${featuredImageHtml}
                <div class="related-post-content">
                    <h4><a href="blog.html?post=${post.slug}">${post.title}</a></h4>
                    <span class="related-post-date">${postDate}</span>
                </div>
            `;
            
            relatedPostsList.appendChild(postElement);
        });
    }
}
