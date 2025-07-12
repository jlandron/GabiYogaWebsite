/**
 * Single Blog Post Page Handler
 * Dedicated module for serving individual blog posts by slug
 */

const { createResponse, createErrorResponse } = require('./utils');
/**
 * Serve a single blog post by its slug
 */
function serveBlogPostPage(slug) {
  if (!slug) {
    return createErrorResponse('Blog post slug is required', 400);
  }

  // Generate header HTML
  
  const blogPostPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading Blog Post... | Gabi Yoga</title>
    <meta name="description" content="Read this insightful article from Gabi Yoga on wellness and mindful living.">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="/static/css/theme-variables.css">
    <link rel="stylesheet" href="/static/css/common-styles.css">
    <link rel="stylesheet" href="/static/css/styles.css">
    <link rel="stylesheet" href="/static/css/blog.css">
</head>
<body>
    <header class="header">
        <nav class="nav-container">
            <a href="/" class="logo">Gabi Yoga</a>
            <ul class="nav-links">
                <li><a href="/">Home</a></li>
                <li><a href="/blog-page">Blog</a></li>
            </ul>
        </nav>
    </header>

    <!-- Blog Post Content -->
    <main class="blog-container">
        <!-- Loading State -->
        <div id="blog-loading" class="loading">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-image"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text"></div>
            <p>Loading blog post...</p>
        </div>

        <!-- Error State -->
        <div id="blog-error" class="error" style="display: none;">
            <h3>Post Not Found</h3>
            <p>Sorry, we couldn't find the blog post you're looking for.</p>
            <a href="/blog-page" class="back-to-blog">Back to Blog</a>
        </div>

        <!-- Blog Post Content -->
        <article id="blog-content" class="blog-post" style="display: none;">
            <!-- Content will be dynamically loaded here -->
        </article>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 Gabi Yoga. Powered by AWS Lambda Serverless Architecture</p>
        </div>
    </footer>

    <script>
        // Get blog post slug from URL
        const slug = decodeURIComponent('${slug}');
        console.log('Loading blog post with slug:', slug);
        
        // Lambda API Configuration
        const API_BASE_URL = window.location.origin;
        
        // Load blog post from API
        async function loadBlogPost() {
            try {
                console.log('Fetching blog post from API:', API_BASE_URL + '/blog/' + slug);
                const response = await fetch(API_BASE_URL + '/blog/' + slug);
                const data = await response.json();
                
                const blogLoading = document.getElementById('blog-loading');
                const blogContent = document.getElementById('blog-content');
                const blogError = document.getElementById('blog-error');
                
                if (data.success && data.post) {
                    const post = data.post;
                    
                    if (post) {
                        // Format date
                        const publishDate = new Date(post.publishedAt || post.createdAt);
                        const formattedDate = publishDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        
                        // Set page title and meta description
                        document.title = post.title + ' | Gabi Yoga';
                        const metaDescription = document.querySelector('meta[name="description"]');
                        if (metaDescription) {
                            metaDescription.setAttribute('content', post.excerpt);
                        }
                        
                        // Generate HTML content with hero image section
                        let postHTML = '';
                        
                        // Add hero image section only if cover image exists
                        if (post.coverImage && post.coverImage.url) {
                            postHTML += '<div class="blog-post-hero">';
                            postHTML += '<img src="' + post.coverImage.url + '" alt="' + post.title + '">';
                            postHTML += '</div>';
                        }
                        
                        // Add content wrapper
                        postHTML += '<div class="blog-post-content-wrapper">';
                        
                        // Add header
                        postHTML += '<header class="blog-post-header">' +
                            '<div class="blog-post-category">' + (post.category || 'Wellness') + '</div>' +
                            '<h1 class="blog-post-title">' + post.title + '</h1>' +
                            '<div class="blog-post-meta">' +
                                '<span>📅 ' + formattedDate + '</span>' +
                                '<span>⏱️ ' + (post.readTime || 3) + ' min read</span>' +
                                '<span>👤 ' + (post.author ? post.author.firstName + ' ' + post.author.lastName : 'Gabi Yoga') + '</span>' +
                            '</div>' +
                        '</header>';
                        
                        // Add content 
                        postHTML += '<div class="blog-post-content">' +
                            (post.content || post.excerpt || '<p>Content not available.</p>') +
                        '</div>';
                        
                        // Add tags if available
                        if (post.tags && post.tags.length > 0) {
                            // Create tag links with string concatenation
                            const tagLinks = post.tags.map(tag => '<a href="/blog-page" class="blog-tag">#' + tag + '</a>').join('');
                            
                            postHTML += '<div class="blog-tags">' +
                                tagLinks +
                            '</div>';
                        }
                        
                        
                        // Close content wrapper
                        postHTML += '</div>';
                        
                        // Add back to blog button
                        postHTML += '<a href="/blog-page" class="back-to-blog">Back to Blog</a>';
                        
                        // Update content and hide loading
                        blogContent.innerHTML = postHTML;
                        blogLoading.style.display = 'none';
                        blogContent.style.display = 'block';
                        
                        console.log('✅ Loaded blog post:', post.title);
                    } else {
                        // Post not found
                        console.error('❌ Blog post not found with slug:', slug);
                        blogLoading.style.display = 'none';
                        blogError.style.display = 'block';
                    }
                } else {
                    throw new Error('Invalid blog response');
                }
            } catch (error) {
                console.error('❌ Error loading blog post:', error);
                document.getElementById('blog-loading').style.display = 'none';
                document.getElementById('blog-error').style.display = 'block';
            }
        }
        
        // Load post when page loads
        document.addEventListener('DOMContentLoaded', () => {
            loadBlogPost();
        });
    </script>
</body>
</html>`;

  return createResponse(200, blogPostPage, {
    'Content-Type': 'text/html; charset=utf-8'
  });
}

module.exports = {
  serveBlogPostPage
};
