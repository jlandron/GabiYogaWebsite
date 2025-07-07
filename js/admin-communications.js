/**
 * Admin Communications JavaScript
 * Handles contact submissions and newsletter subscribers management
 */

// Global state
let currentContactPage = 1;
let currentSubscriberPage = 1;
let contactSearchTerm = '';
let subscriberSearchTerm = '';
let currentContactSubmission = null;
let selectedBlogPost = null;
let blogPosts = [];
let activeSubscriberCount = 0;

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  // Use centralized authentication handler for admin pages
    try {
        const authenticated = await AuthHandler.initAdminPage();
        if (!authenticated) {
            return; // AuthHandler will have already redirected as needed
        }
    
        // Load data for the page
        loadContactSubmissions();
        loadNewsletterSubscribers();
        
        // Add enter key search functionality
        document.getElementById('contactSearch').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchContacts();
            }
        });
        
        document.getElementById('subscriberSearch').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchSubscribers();
            }
        });

        // Set up newsletter functionality
        const sendNewsletterBtn = document.getElementById('send-newsletter-btn');
        if (sendNewsletterBtn) {
            sendNewsletterBtn.addEventListener('click', openNewsletterModal);
        }

        // Send button in newsletter modal
        const sendSelectedBlogBtn = document.getElementById('send-selected-blog');
        if (sendSelectedBlogBtn) {
            sendSelectedBlogBtn.addEventListener('click', sendNewsletterToSubscribers);
        }
    } catch (error) {
        console.error('Error initializing admin communications page:', error);
        showError('Failed to initialize page. Please try refreshing.');
    }
});

/**
 * Load contact submissions with pagination and search
 */
async function loadContactSubmissions(page = 1, search = '') {
    const loadingElement = document.getElementById('contactSubmissionsLoading');
    const tableElement = document.getElementById('contactSubmissionsTable');
    
    loadingElement.style.display = 'block';
    tableElement.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10',
            search: search
        });
        
        const data = await AdminApiUtils.request(`/api/admin/contact-submissions?${params}`, 'GET');
        
        if (data.success) {
            renderContactSubmissions(data.submissions);
            updateContactPagination(data.pagination);
            currentContactPage = page;
            contactSearchTerm = search;
        } else {
            throw new Error(data.message || 'Failed to load contact submissions');
        }
    } catch (error) {
        console.error('Error loading contact submissions:', error);
        showError('Failed to load contact submissions: ' + error.message);
        document.getElementById('contactSubmissionsBody').innerHTML = 
            '<tr><td colspan="6" class="text-center">Error loading contact submissions</td></tr>';
    } finally {
        loadingElement.style.display = 'none';
        tableElement.style.display = 'table';
    }
}

/**
 * Load newsletter subscribers with pagination and search
 */
async function loadNewsletterSubscribers(page = 1, search = '') {
    const loadingElement = document.getElementById('subscribersLoading');
    const tableElement = document.getElementById('subscribersTable');
    
    loadingElement.style.display = 'block';
    tableElement.style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10',
            search: search
        });
        
        const data = await AdminApiUtils.request(`/api/admin/newsletter-subscribers?${params}`, 'GET');
        
        if (data.success) {
            renderNewsletterSubscribers(data.subscribers);
            updateSubscriberPagination(data.pagination);
            currentSubscriberPage = page;
            subscriberSearchTerm = search;
        } else {
            throw new Error(data.message || 'Failed to load newsletter subscribers');
        }
    } catch (error) {
        console.error('Error loading newsletter subscribers:', error);
        showError('Failed to load newsletter subscribers: ' + error.message);
        document.getElementById('subscribersBody').innerHTML = 
            '<tr><td colspan="4" class="text-center">Error loading newsletter subscribers</td></tr>';
    } finally {
        loadingElement.style.display = 'none';
        tableElement.style.display = 'table';
    }
}

/**
 * Render contact submissions table
 */
function renderContactSubmissions(submissions) {
    const tbody = document.getElementById('contactSubmissionsBody');
    
    if (!submissions || submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No contact submissions found</td></tr>';
        return;
    }
    
    tbody.innerHTML = submissions.map(submission => {
        const statusClass = getStatusClass(submission.status);
        const date = new Date(submission.created_at).toLocaleDateString();
        const time = new Date(submission.created_at).toLocaleTimeString();
        
        return `
            <tr>
                <td><strong>${escapeHtml(submission.name)}</strong></td>
                <td>${escapeHtml(submission.email)}</td>
                <td>${escapeHtml(truncateText(submission.subject, 40))}</td>
                <td><span class="status-badge ${statusClass}">${submission.status}</span></td>
                <td>${date}<br><small>${time}</small></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewContactDetails(${submission.submission_id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render newsletter subscribers table
 */
function renderNewsletterSubscribers(subscribers) {
    const tbody = document.getElementById('subscribersBody');
    
    if (!subscribers || subscribers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No newsletter subscribers found</td></tr>';
        return;
    }
    
    tbody.innerHTML = subscribers.map(subscriber => {
        const statusClass = subscriber.active ? 'status-active' : 'status-inactive';
        const statusText = subscriber.active ? 'Active' : 'Inactive';
        const date = new Date(subscriber.subscribe_date).toLocaleDateString();
        const time = new Date(subscriber.subscribe_date).toLocaleTimeString();
        
        return `
            <tr>
                <td><strong>${escapeHtml(subscriber.email)}</strong></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${date}<br><small>${time}</small></td>
                <td>
                    <button class="btn btn-sm ${subscriber.active ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleSubscriberStatus(${subscriber.subscriber_id}, ${!subscriber.active})">
                        <i class="fas ${subscriber.active ? 'fa-pause' : 'fa-play'}"></i> 
                        ${subscriber.active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * View contact details in modal
 */
async function viewContactDetails(submissionId) {
    try {
        const modal = document.getElementById('contactDetailModal');
        const content = document.getElementById('contactDetailContent');
        const statusSelect = document.getElementById('contactStatusSelect');
        
        // Show loading state
        content.innerHTML = `
            <div class="contact-detail-grid">
                <div class="detail-item">
                    <label>Name:</label>
                    <span>Loading...</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>Loading...</span>
                </div>
                <div class="detail-item">
                    <label>Subject:</label>
                    <span>Loading...</span>
                </div>
                <div class="detail-item full-width">
                    <label>Message:</label>
                    <div class="message-content">Loading...</div>
                </div>
                <div class="detail-item">
                    <label>Date:</label>
                    <span>Loading...</span>
                </div>
            </div>
        `;
        
        // Store current submission ID for status updates
        currentContactSubmission = submissionId;
        
        // Show modal
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Fetch contact details from API
        const data = await AdminApiUtils.request(`/api/admin/contact-submissions/${submissionId}`, 'GET');
        
        if (data.success && data.submission) {
            const submission = data.submission;
            const date = new Date(submission.created_at).toLocaleDateString();
            const time = new Date(submission.created_at).toLocaleTimeString();
            
            // Update modal content with actual data
            content.innerHTML = `
                <div class="contact-detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${escapeHtml(submission.name)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${escapeHtml(submission.email)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Subject:</label>
                        <span>${escapeHtml(submission.subject)}</span>
                    </div>
                    <div class="detail-item full-width">
                        <label>Message:</label>
                        <div class="message-content">${escapeHtml(submission.message)}</div>
                    </div>
                    <div class="detail-item">
                        <label>Date:</label>
                        <span>${date} at ${time}</span>
                    </div>
                </div>
            `;
            
            // Set the current status in the select dropdown
            statusSelect.value = submission.status || 'New';
        } else {
            throw new Error(data.message || 'Failed to load contact details');
        }
        
    } catch (error) {
        console.error('Error viewing contact details:', error);
        showError('Failed to load contact details: ' + error.message);
        
        // Show error in modal content
        const content = document.getElementById('contactDetailContent');
        content.innerHTML = `
            <div class="contact-detail-grid">
                <div class="detail-item full-width">
                    <label>Error:</label>
                    <span style="color: var(--danger-color);">Failed to load contact details. Please try again.</span>
                </div>
            </div>
        `;
    }
}

/**
 * Update contact submission status
 */
async function updateContactStatus() {
    if (!currentContactSubmission) {
        showError('No contact submission selected');
        return;
    }
    
    const statusSelect = document.getElementById('contactStatusSelect');
    const newStatus = statusSelect.value;
    
    try {
        const data = await AdminApiUtils.request(
            `/api/admin/contact-submissions/${currentContactSubmission}/status`,
            'PUT',
            { status: newStatus }
        );
        
        if (data.success) {
            showSuccess('Contact status updated successfully');
            closeContactModal();
            loadContactSubmissions(currentContactPage, contactSearchTerm);
        } else {
            throw new Error(data.message || 'Failed to update contact status');
        }
    } catch (error) {
        console.error('Error updating contact status:', error);
        showError('Failed to update contact status: ' + error.message);
    }
}

/**
 * Toggle subscriber status (activate/deactivate)
 */
async function toggleSubscriberStatus(subscriberId, activate) {
    try {
        const data = await AdminApiUtils.request(
            `/api/admin/newsletter-subscribers/${subscriberId}/status`,
            'PUT',
            { active: activate }
        );
        
        if (data.success) {
            showSuccess(`Subscriber ${activate ? 'activated' : 'deactivated'} successfully`);
            loadNewsletterSubscribers(currentSubscriberPage, subscriberSearchTerm);
        } else {
            throw new Error(data.message || 'Failed to update subscriber status');
        }
    } catch (error) {
        console.error('Error updating subscriber status:', error);
        showError('Failed to update subscriber status: ' + error.message);
    }
}

/**
 * Search contacts
 */
function searchContacts() {
    const searchInput = document.getElementById('contactSearch');
    const searchTerm = searchInput.value.trim();
    loadContactSubmissions(1, searchTerm);
}

/**
 * Search subscribers
 */
function searchSubscribers() {
    const searchInput = document.getElementById('subscriberSearch');
    const searchTerm = searchInput.value.trim();
    loadNewsletterSubscribers(1, searchTerm);
}

/**
 * Change contact page
 */
function changeContactPage(direction) {
    const newPage = currentContactPage + direction;
    if (newPage >= 1) {
        loadContactSubmissions(newPage, contactSearchTerm);
    }
}

/**
 * Change subscriber page
 */
function changeSubscriberPage(direction) {
    const newPage = currentSubscriberPage + direction;
    if (newPage >= 1) {
        loadNewsletterSubscribers(newPage, subscriberSearchTerm);
    }
}

/**
 * Update contact pagination controls
 */
function updateContactPagination(pagination) {
    const prevBtn = document.getElementById('contactPrevBtn');
    const nextBtn = document.getElementById('contactNextBtn');
    const pageInfo = document.getElementById('contactPageInfo');
    
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
}

/**
 * Update subscriber pagination controls
 */
function updateSubscriberPagination(pagination) {
    const prevBtn = document.getElementById('subscriberPrevBtn');
    const nextBtn = document.getElementById('subscriberNextBtn');
    const pageInfo = document.getElementById('subscriberPageInfo');
    
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
}

/**
 * Close contact modal
 */
function closeContactModal() {
    const modal = document.getElementById('contactDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentContactSubmission = null;
}

/**
 * Get status class for styling
 */
function getStatusClass(status) {
    switch (status) {
        case 'New':
            return 'status-new';
        case 'Read':
            return 'status-read';
        case 'Responded':
            return 'status-responded';
        case 'Archived':
            return 'status-archived';
        default:
            return 'status-default';
    }
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show success message
 */
function showSuccess(message) {
    // You can implement a toast notification system here
    alert(message); // Simple implementation for now
}

/**
 * Show error message
 */
function showError(message) {
    // You can implement a toast notification system here
    alert('Error: ' + message); // Simple implementation for now
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('contactDetailModal');
    if (event.target === modal) {
        closeContactModal();
    }

    const newsletterModal = document.getElementById('newsletter-blog-modal');
    if (event.target === newsletterModal) {
        closeNewsletterModal();
    }
});

/**
 * Open the newsletter blog selection modal
 */
async function openNewsletterModal() {
    const modal = document.getElementById('newsletter-blog-modal');
    if (!modal) return;

    // Reset state
    selectedBlogPost = null;
    blogPosts = [];
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Load blog posts
    await loadBlogPosts();

    // Count active subscribers
    await countActiveSubscribers();
}

/**
 * Close the newsletter modal
 */
function closeNewsletterModal() {
    const modal = document.getElementById('newsletter-blog-modal');
    if (!modal) return;
    
    modal.style.display = 'none';
    document.body.style.overflow = '';
    
    // Reset state
    selectedBlogPost = null;
    
    // Reset preview
    const previewContainer = document.getElementById('newsletter-preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = `
            <div class="newsletter-placeholder">
                <i class="fas fa-newspaper"></i>
                <p>Select a blog post to preview the newsletter</p>
            </div>
        `;
    }
    
    // Disable send button
    const sendBtn = document.getElementById('send-selected-blog');
    if (sendBtn) {
        sendBtn.disabled = true;
    }
}

/**
 * Load blog posts for the newsletter selection
 */
async function loadBlogPosts() {
    const loadingElement = document.getElementById('blog-posts-loading');
    const blogList = document.getElementById('newsletter-blog-list');
    
    if (loadingElement) loadingElement.style.display = 'block';
    if (blogList) blogList.innerHTML = '';
    
    try {
        // Fetch published blog posts from API
        const data = await AdminApiUtils.request('/api/blog/posts?published=true', 'GET');
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load blog posts');
        }
        
        // Store posts globally
        blogPosts = data.posts || [];
        
        // Render the blog posts
        renderBlogPosts(blogPosts);
    } catch (error) {
        console.error('Error loading blog posts:', error);
        showError('Failed to load blog posts: ' + error.message);
        if (blogList) {
            blogList.innerHTML = `
                <div class="empty-state">
                    <p>Error loading blog posts. Please try again.</p>
                </div>
            `;
        }
    } finally {
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

/**
 * Render blog posts list in newsletter modal
 */
function renderBlogPosts(posts) {
    const blogList = document.getElementById('newsletter-blog-list');
    if (!blogList) return;
    
    if (!posts || posts.length === 0) {
        blogList.innerHTML = `
            <div class="empty-state">
                <p>No blog posts found. Please create and publish blog posts first.</p>
            </div>
        `;
        return;
    }
    
    // Sort posts by published date (newest first)
    const sortedPosts = [...posts].sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.createdAt);
        const dateB = new Date(b.publishedAt || b.createdAt);
        return dateB - dateA;
    });
    
    blogList.innerHTML = sortedPosts.map(post => {
        const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString();
        
        return `
            <div class="blog-post-item" data-id="${post._id}">
                <div class="blog-post-info">
                    <div class="blog-post-title">${escapeHtml(post.title)}</div>
                    <div class="blog-post-meta">
                        ${post.author} | ${date}
                    </div>
                </div>
                <div class="blog-post-actions">
                    <button class="btn btn-sm btn-primary select-post-btn">
                        <i class="fas fa-check-circle"></i> Select
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to select buttons
    const selectButtons = blogList.querySelectorAll('.select-post-btn');
    selectButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const postItem = button.closest('.blog-post-item');
            const postId = postItem.dataset.id;
            selectBlogPost(postId);
        });
    });
    
    // Add event listeners to post items (clicking anywhere)
    const postItems = blogList.querySelectorAll('.blog-post-item');
    postItems.forEach(item => {
        item.addEventListener('click', () => {
            const postId = item.dataset.id;
            selectBlogPost(postId);
        });
    });
}

/**
 * Select a blog post for the newsletter
 */
function selectBlogPost(postId) {
    // Find the post
    const post = blogPosts.find(p => p._id.toString() === postId);
    if (!post) return;
    
    // Update selected post
    selectedBlogPost = post;
    
    // Update UI to show selection
    const blogItems = document.querySelectorAll('.blog-post-item');
    blogItems.forEach(item => {
        if (item.dataset.id === postId) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
    
    // Update preview
    updateNewsletterPreview(post);
    
    // Enable send button
    const sendBtn = document.getElementById('send-selected-blog');
    if (sendBtn && activeSubscriberCount > 0) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Send to ${activeSubscriberCount} Active Subscribers`;
    }
}

/**
 * Update the newsletter preview with the selected blog post
 */
function updateNewsletterPreview(post) {
    const previewContainer = document.getElementById('newsletter-preview-container');
    if (!previewContainer) return;
    
    // Create formatted date
    const postDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    // Create the preview HTML
    previewContainer.innerHTML = `
        <div class="newsletter-email-template">
            <div class="newsletter-email-header">
                <h2>Gabi Yoga Newsletter</h2>
            </div>
            <div class="newsletter-email-content">
                <h3>${escapeHtml(post.title)}</h3>
                <p><em>By ${escapeHtml(post.author)} - ${postDate}</em></p>
                
                ${post.coverImage ? `
                <div class="blog-cover-image">
                    <img src="${post.coverImage.url}" alt="${escapeHtml(post.coverImage.alt || 'Blog post image')}" style="max-width: 100%; height: auto;">
                </div>` : ''}
                
                <div class="blog-excerpt">
                    ${escapeHtml(post.excerpt || 'No excerpt available.')}
                </div>
                
                <p style="margin-top: 20px;">
                    <a href="${window.location.origin}/blog.html?post=${post.slug}" 
                       style="background-color: #7fa99b; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
                        Read Full Article
                    </a>
                </p>
            </div>
            <div class="newsletter-email-footer">
                <p>Thank you for subscribing to Gabi Yoga newsletter!</p>
                <p><a href="#" class="newsletter-unsubscribe-link">Unsubscribe</a></p>
            </div>
        </div>
    `;
}

/**
 * Count active subscribers
 */
async function countActiveSubscribers() {
    try {
        const data = await AdminApiUtils.request('/api/admin/newsletter-subscribers/active-count', 'GET');
        
        if (data.success) {
            activeSubscriberCount = data.count || 0;
            
            // Update send button text if a post is selected
            const sendBtn = document.getElementById('send-selected-blog');
            if (sendBtn && selectedBlogPost) {
                sendBtn.disabled = activeSubscriberCount === 0;
                sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Send to ${activeSubscriberCount} Active Subscribers`;
            }
            
            return activeSubscriberCount;
        } else {
            throw new Error(data.message || 'Failed to count active subscribers');
        }
    } catch (error) {
        console.error('Error counting active subscribers:', error);
        return 0;
    }
}

/**
 * Send newsletter to all active subscribers
 */
async function sendNewsletterToSubscribers() {
    if (!selectedBlogPost) {
        showError('Please select a blog post first');
        return;
    }
    
    const sendBtn = document.getElementById('send-selected-blog');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.classList.add('sending');
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    }
    
    try {
        // Get post ID - different formats might be returned depending on the database
        const blogPostId = selectedBlogPost._id || selectedBlogPost.id || selectedBlogPost.post_id;
        
        if (!blogPostId) {
            throw new Error('Could not determine blog post ID');
        }
        
        console.log('Sending newsletter with post ID:', blogPostId);
        
        const data = await AdminApiUtils.request('/api/admin/send-newsletter', 'POST', {
            blogPostId: blogPostId
        });
        
        if (data.success) {
            showSuccess(`Newsletter sent successfully to ${data.sentCount} subscribers!`);
            closeNewsletterModal();
        } else {
            throw new Error(data.message || 'Failed to send newsletter');
        }
    } catch (error) {
        console.error('Error sending newsletter:', error);
        showError('Failed to send newsletter: ' + error.message);
        
        // Re-enable the button
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('sending');
            sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Send to ${activeSubscriberCount} Active Subscribers`;
        }
    }
}
