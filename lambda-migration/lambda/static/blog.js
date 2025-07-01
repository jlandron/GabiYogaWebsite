/**
 * Blog Page Handler
 * Dedicated module for serving the blog page
 */

const { createResponse } = require('./utils');

/**
 * Serve the blog page with all published posts
 */
function serveBlogPage() {
  // Generate header HTML
  
  const blogPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - Gabi Yoga | Wellness & Mindfulness Articles</title>
    <meta name="description" content="Discover insights on yoga, wellness, and mindful living through our thoughtful blog posts and articles.">
    
    <!-- Centralized CSS -->
    <link rel="stylesheet" href="/dev/static/styles.css">
</head>
<body>
   <header class="header">
        <nav class="nav-container">
            <a href="/dev" class="logo">Gabi Yoga</a>
            <ul class="nav-links">
                <li><a href="/dev">Home</a></li>
                <li><a href="/dev/blog-page" class="active">Blog</a></li>
            </ul>
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="blog-hero">
        <div class="hero-content">
            <h1>Wellness & Mindfulness Blog</h1>
            <p>Discover insights on yoga, wellness, and mindful living through thoughtful articles</p>
        </div>
    </section>

    <!-- Blog Content -->
    <div class="blog-layout">
        <!-- Main Content -->
        <main class="blog-container">
            <!-- Loading State -->
            <div id="blog-loading" class="loading">
                <p>📝 Loading blog posts...</p>
            </div>

            <!-- Blog Posts List -->
            <div id="blog-grid" class="blog-list" style="display: none;">
                <!-- Blog posts will be loaded here -->
            </div>

            <!-- No Posts Message -->
            <div id="no-posts" class="no-posts" style="display: none;">
                <h3>No Posts Found</h3>
                <p>There are currently no blog posts available. Check back soon for new content!</p>
            </div>
        </main>

        <!-- Sidebar -->
        <aside class="blog-sidebar">
            <!-- Search -->
            <div class="sidebar-section">
                <h3>Search</h3>
                <div class="search-box">
                    <input type="text" id="blog-search" placeholder="Search posts..." />
                    <button id="search-button">🔍</button>
                </div>
            </div>

            <!-- Categories -->
            <div class="sidebar-section">
                <h3>Categories</h3>
                <div id="category-filters" class="category-list">
                    <!-- Categories will be loaded here -->
                </div>
            </div>
        </aside>
    </div>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2025 Gabi Yoga. Powered by AWS Lambda Serverless Architecture</p>
        </div>
    </footer>

    <script>
        // Lambda API Configuration - Simple fixed URL approach
        const API_BASE_URL = window.location.origin + '/dev';
        
        // Filter posts by search term
        function filterPostsBySearch(posts, searchTerm) {
            if (!searchTerm) return posts;
            searchTerm = searchTerm.toLowerCase();
            return posts.filter(post => 
                post.title.toLowerCase().includes(searchTerm) ||
                post.excerpt.toLowerCase().includes(searchTerm)
            );
        }

        // Filter posts by category
        function filterPostsByCategory(posts, category) {
            if (!category || category === 'All') return posts;
            return posts.filter(post => post.category === category);
        }

        // Update category filters
        function updateCategoryFilters(posts) {
            const categories = ['All', ...new Set(posts.map(post => post.category || 'General'))];
            const categoryFiltersHTML = categories.map(category => 
                '<button class="category-filter" data-category="' + category + '">' + 
                    category + 
                '</button>'
            ).join('');
            document.getElementById('category-filters').innerHTML = categoryFiltersHTML;

            // Add click handlers
            document.querySelectorAll('.category-filter').forEach(button => {
                button.addEventListener('click', () => {
                    // Update active state
                    document.querySelectorAll('.category-filter').forEach(b => 
                        b.classList.remove('active'));
                    button.classList.add('active');

                    // Filter posts
                    const category = button.dataset.category;
                    const searchTerm = document.getElementById('blog-search').value;
                    const filtered = filterPostsByCategory(
                        filterPostsBySearch(allPosts, searchTerm),
                        category
                    );
                    updateBlogGrid(filtered);
                });
            });

            // Set 'All' as active by default
            document.querySelector('.category-filter').classList.add('active');
        }

        // Update blog grid with filtered posts
        function updateBlogGrid(posts) {
            const blogGrid = document.getElementById('blog-grid');
            const noPosts = document.getElementById('no-posts');

            if (posts.length > 0) {
                const blogCardsHTML = posts.map(post => {
                    const publishDate = new Date(post.publishedAt || post.createdAt);
                    const category = post.category || 'Wellness';
                    const readTime = post.readTime || 3;
                    const formattedDate = publishDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    return '<a href="/dev/blog-page/' + post.slug + '" class="blog-card' + (!post.coverImage ? ' no-image' : '') + '">' +
                            (post.coverImage ? 
                            '<div class="blog-card-image" style="background-image: url(' + post.coverImage.url + ')">' +
                                '<div class="blog-card-category">' + category + '</div>' +
                            '</div>' : '') +
                            '<div class="blog-card-content">' +
                                '<h2 class="blog-card-title">' + post.title + '</h2>' +
                                '<div class="blog-card-meta">' +
                                    '<span>📅 ' + formattedDate + '</span>' +
                                    '<span>⏱️ ' + readTime + ' min read</span>' +
                                '</div>' +
                                '<p class="blog-card-excerpt">' + post.excerpt + '</p>' +
                            '</div>' +
                        '</a>';
                }).join('');
                
                blogGrid.innerHTML = blogCardsHTML;
                blogGrid.style.display = 'block';
                noPosts.style.display = 'none';
            } else {
                blogGrid.style.display = 'none';
                noPosts.style.display = 'block';
            }
        }

        // Store all posts globally for filtering
        let allPosts = [];

        // Load blog posts from API
        async function loadBlogPosts() {
            try {
                console.log('Loading blog posts from:', API_BASE_URL + '/blog');
                const response = await fetch(API_BASE_URL + '/blog?limit=50');
                const data = await response.json();
                
                const blogLoading = document.getElementById('blog-loading');
                const blogGrid = document.getElementById('blog-grid');
                const noPosts = document.getElementById('no-posts');
                
                if (data.success && data.posts && data.posts.length > 0) {
                    allPosts = data.posts;
                    
                    // Initialize category filters
                    updateCategoryFilters(allPosts);
                    
                    // Initial display of all posts
                    updateBlogGrid(allPosts);
                    
                    // Hide loading
                    blogLoading.style.display = 'none';
                    
                    console.log('✅ Loaded', posts.length, 'blog posts');
                } else {
                    // No posts found
                    blogLoading.style.display = 'none';
                    noPosts.style.display = 'block';
                }
            } catch (error) {
                console.error('❌ Error loading blog posts:', error);
                document.getElementById('blog-loading').innerHTML = 
                    '<p style="color: #dc3545;"><strong>Error loading blog posts</strong><br>' + error.message + '</p>';
            }
        }
        
        // Initialize search and load posts
        document.addEventListener('DOMContentLoaded', () => {
            // Set up search handler
            const searchInput = document.getElementById('blog-search');
            const searchButton = document.getElementById('search-button');
            
            const handleSearch = () => {
                const searchTerm = searchInput.value;
                const activeCategory = document.querySelector('.category-filter.active')?.dataset.category;
                const filtered = filterPostsByCategory(
                    filterPostsBySearch(allPosts, searchTerm),
                    activeCategory
                );
                updateBlogGrid(filtered);
            };

            searchInput.addEventListener('input', handleSearch);
            searchButton.addEventListener('click', handleSearch);
            
            // Load initial posts
            loadBlogPosts();
        });
    </script>
</body>
</html>`;

  return createResponse(200, blogPage, {
    'Content-Type': 'text/html; charset=utf-8'
  });
}

module.exports = {
  serveBlogPage
};
