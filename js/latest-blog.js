/**
 * Latest Blog Post Module
 * Fetches and displays the most recent blog post on the homepage
 */
document.addEventListener('DOMContentLoaded', function() {
    loadLatestBlogPost();
});

/**
 * Load the latest blog post
 */
async function loadLatestBlogPost() {
    try {
        const latestPostContainer = document.getElementById('latest-blog-content');
        const loadingIndicator = document.getElementById('latest-blog-loading');
        
        if (!latestPostContainer) return;
        
        // Show loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
        
        // Fetch latest published post
        const response = await fetch('/api/blog/posts?limit=1&published=true');
        
        if (!response.ok) {
            throw new Error('Failed to load blog post');
        }
        
        const data = await response.json();
        
        if (!data.posts || data.posts.length === 0) {
            latestPostContainer.innerHTML = '<p class="no-posts">No blog posts available yet.</p>';
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }
        
        const post = data.posts[0];
        
        // Format the date
        const postDate = post.publishedAt 
            ? new Date(post.publishedAt).toLocaleDateString()
            : new Date(post.createdAt).toLocaleDateString();
        
        let coverImage = '';
        if (post.coverImage && post.coverImage.url) {
            coverImage = `
                <div class="latest-post-image">
                    <img src="${post.coverImage.url}" alt="${post.coverImage.alt || post.title}">
                </div>
            `;
        }
        
        // Generate an excerpt if not available
        const excerpt = post.excerpt || truncateText(stripHtml(post.content), 150);
        
        // Create HTML for the post
        const postHTML = `
            <div class="latest-post">
                ${coverImage}
                <div class="latest-post-content">
                    <h3>${post.title}</h3>
                    <div class="post-meta">
                        <span class="post-author"><i class="fas fa-user"></i> ${post.author || 'Gabi'}</span>
                        <span class="post-date"><i class="far fa-calendar-alt"></i> ${postDate}</span>
                    </div>
                    <p class="post-excerpt">${excerpt}</p>
                    <a href="/blog.html?post=${post.slug}" class="btn-small">Read More</a>
                </div>
            </div>
        `;
        
        // Update the container with the post
        latestPostContainer.innerHTML = postHTML;
        
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading latest blog post:', error);
        
        const latestPostContainer = document.getElementById('latest-blog-content');
        const loadingIndicator = document.getElementById('latest-blog-loading');
        
        if (latestPostContainer) {
            latestPostContainer.innerHTML = '<p class="error-message">Unable to load latest blog post. Please try again later.</p>';
        }
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
    if (!html) return '';
    
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * Truncate text to a specific length and add ellipsis
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
}
