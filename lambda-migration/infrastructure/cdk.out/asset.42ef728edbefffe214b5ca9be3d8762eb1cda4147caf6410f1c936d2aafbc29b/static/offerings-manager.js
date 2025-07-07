/**
 * Offerings Manager
 * 
 * Admin interface for managing offerings (packages, memberships, private sessions)
 */

// Global state
const offeringsManager = {
    offerings: [],
    currentOffering: null,
    isEditing: false,
    uploadedImageFile: null,
    uploadedImageS3Key: null,
    imageCompressor: null,
};

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize image compressor - using the global ImageCompressor utility
    offeringsManager.imageCompressor = window.ImageCompressor;
    
    initOfferingsManager();
});

/**
 * Initialize offerings manager
 */
function initOfferingsManager() {
    // Set up event listeners
    document.getElementById('new-offering-btn').addEventListener('click', () => {
        showOfferingEditor();
    });
    
    // Load existing offerings
    loadOfferings();
}

/**
 * Load offerings from API
 */
async function loadOfferings() {
    try {
        const offeringsList = document.querySelector('.offerings-list');
        offeringsList.innerHTML = '<div class="loading">Loading offerings...</div>';
        
        const response = await fetch('/offerings');
        const data = await response.json();
        
        if (data.success) {
            offeringsManager.offerings = data.offerings || [];
            renderOfferingsList();
        } else {
            throw new Error(data.message || 'Failed to load offerings');
        }
    } catch (error) {
        console.error('Error loading offerings:', error);
        showNotification('Failed to load offerings: ' + error.message, 'error');
        document.querySelector('.offerings-list').innerHTML = 
            '<div class="error-message">Error loading offerings. Please try again.</div>';
    }
}

/**
 * Render offerings list
 */
function renderOfferingsList() {
    const offeringsList = document.querySelector('.offerings-list');
    
    if (offeringsManager.offerings.length === 0) {
        offeringsList.innerHTML = '<div class="empty-state">No offerings found. Click "New Offering" to create one.</div>';
        return;
    }
    
    // Group offerings by type
    const offeringsByType = offeringsManager.offerings.reduce((acc, offering) => {
        const type = offering.type || 'Other';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(offering);
        return acc;
    }, {});
    
    // Generate HTML
    let html = '';
    
    // Sort types for consistent order
    const types = Object.keys(offeringsByType).sort();
    
    types.forEach(type => {
        const offerings = offeringsByType[type];
        
        html += `
            <div class="offerings-group">
                <h3 class="offerings-type-title">${type}</h3>
                <div class="offerings-grid">
        `;
        
        // Sort offerings by name within each type
        const sortedOfferings = offerings.sort((a, b) => a.name.localeCompare(b.name));
        
        sortedOfferings.forEach(offering => {
            const statusClass = offering.status === 'Active' ? 'status-active' : 
                              offering.status === 'Draft' ? 'status-draft' : 'status-disabled';
            
            html += `
                <div class="offering-card admin-card" data-id="${offering.id}">
                    <div class="offering-image">
                        <img src="${offering.imageUrl || ''}" alt="${offering.name}">
                    </div>
                    <div class="offering-content">
                        <div class="offering-badge ${statusClass}">${offering.status}</div>
                        <h4 class="offering-name">${offering.name}</h4>
                        <p class="offering-type">${offering.type}</p>
                        <p class="offering-price">${formatPrice(offering.price)}</p>
                        <div class="offering-actions">
                            <button class="action-btn edit-offering-btn" data-id="${offering.id}">Edit</button>
                            <button class="action-btn delete-offering-btn" data-id="${offering.id}">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    offeringsList.innerHTML = html;
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-offering-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const offerId = event.target.dataset.id;
            editOffering(offerId);
        });
    });
    
    document.querySelectorAll('.delete-offering-btn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const offerId = event.target.dataset.id;
            confirmDeleteOffering(offerId);
        });
    });
}

/**
 * Format price for display
 */
function formatPrice(price) {
    if (!price) return 'Contact for pricing';
    
    // Check if price is a number or a string that can be converted to a number
    if (!isNaN(price)) {
        return '$' + parseFloat(price).toFixed(2);
    }
    
    return price; // Return as is if it's a custom pricing string
}

/**
 * Show offering editor
 */
function showOfferingEditor(offeringId = null) {
    offeringsManager.isEditing = !!offeringId;
    offeringsManager.uploadedImageFile = null;
    offeringsManager.uploadedImageS3Key = null;
    
    const container = document.getElementById('offering-editor-container');
    container.style.display = 'block';
    document.querySelector('.offerings-list').style.display = 'none';
    
    // Create editor HTML
    container.innerHTML = `
        <div class="editor-header">
            <h3>${offeringsManager.isEditing ? 'Edit Offering' : 'New Offering'}</h3>
            <button class="close-editor-btn">&times;</button>
        </div>
        <div class="editor-content">
            <form id="offering-form">
                <div class="form-group">
                    <label for="offering-name">Name *</label>
                    <input type="text" id="offering-name" required>
                </div>
                
                <div class="form-group">
                    <label for="offering-type">Type *</label>
                    <select id="offering-type" required>
                        <option value="">Select type...</option>
                        <option value="Package">Package</option>
                        <option value="Membership">Membership</option>
                        <option value="Private">Private Session</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="offering-description">Description *</label>
                    <textarea id="offering-description" rows="4" required></textarea>
                </div>
                
                <div class="form-group">
                    <label for="offering-price">Price</label>
                    <input type="text" id="offering-price" placeholder="e.g. 150.00 or 'Contact for pricing'">
                </div>
                
                <div class="form-group">
                    <label for="offering-duration">Duration</label>
                    <input type="text" id="offering-duration" placeholder="e.g. 60 minutes, 3 months, etc.">
                </div>
                
                <div class="form-group">
                    <label>Image</label>
                    <div class="image-upload-container">
                        <div class="image-preview">
                            <img id="offering-image-preview" src="/static/images/placeholder-yoga.jpg" alt="Offering image preview">
                        </div>
                        <div class="image-upload-actions">
                            <input type="file" id="offering-image" accept="image/*" style="display: none;">
                            <button type="button" id="upload-image-btn" class="secondary-btn">Upload Image</button>
                            <div id="upload-progress" class="upload-progress" style="display: none;">
                                <div class="progress-bar"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Details</label>
                    <div class="details-container">
                        <div id="details-rows">
                            <!-- Details rows will be added here -->
                        </div>
                        <button type="button" id="add-detail-btn" class="secondary-btn">Add Detail</button>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="offering-status">Status</label>
                    <select id="offering-status">
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Disabled">Disabled</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="button" id="cancel-offering-btn" class="cancel-btn">Cancel</button>
                    <button type="submit" id="save-offering-btn" class="primary-btn">Save Offering</button>
                </div>
            </form>
        </div>
    `;
    
    // Add event listeners
    document.querySelector('.close-editor-btn').addEventListener('click', hideOfferingEditor);
    document.getElementById('cancel-offering-btn').addEventListener('click', hideOfferingEditor);
    document.getElementById('offering-form').addEventListener('submit', saveOffering);
    document.getElementById('upload-image-btn').addEventListener('click', () => {
        document.getElementById('offering-image').click();
    });
    document.getElementById('offering-image').addEventListener('change', handleOfferingImageUpload);
    document.getElementById('add-detail-btn').addEventListener('click', addDetailRow);
    
    // If editing, load the offering data
    if (offeringId) {
        loadOfferingForEditing(offeringId);
    } else {
        // Add a couple of detail rows for new offerings
        addDetailRow();
        addDetailRow();
    }
}

/**
 * Add a new detail row to the editor
 */
function addDetailRow(key = '', value = '') {
    const detailsContainer = document.getElementById('details-rows');
    const rowId = 'detail-' + Date.now();
    
    const rowHtml = `
        <div class="detail-row" id="${rowId}">
            <input type="text" class="detail-key" placeholder="Key" value="${escapeHTML(key)}">
            <input type="text" class="detail-value" placeholder="Value" value="${escapeHTML(value)}">
            <button type="button" class="remove-detail-btn" data-row-id="${rowId}">&times;</button>
        </div>
    `;
    
    detailsContainer.insertAdjacentHTML('beforeend', rowHtml);
    
    // Add event listener to the new remove button
    document.querySelector(`#${rowId} .remove-detail-btn`).addEventListener('click', (e) => {
        const rowId = e.target.dataset.rowId;
        document.getElementById(rowId).remove();
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    // Convert to string if not already a string
    str = String(str);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Load offering data for editing
 */
async function loadOfferingForEditing(offerId) {
    try {
        const response = await fetch(`/offerings/${offerId}`);
        const data = await response.json();
        
        if (!data.success || !data.offering) {
            throw new Error(data.message || 'Offering not found');
        }
        
        const offering = data.offering;
        offeringsManager.currentOffering = offering;
        
        // Fill in the form fields
        document.getElementById('offering-name').value = offering.name || '';
        document.getElementById('offering-type').value = offering.type || '';
        document.getElementById('offering-description').value = offering.description || '';
        document.getElementById('offering-price').value = offering.price || '';
        document.getElementById('offering-duration').value = offering.duration || '';
        document.getElementById('offering-status').value = offering.status || 'Draft';
        
        // Set image preview
        if (offering.imageUrl) {
            document.getElementById('offering-image-preview').src = offering.imageUrl;
            
            // Store the existing coverImage data if available (to preserve it if image isn't changed)
            if (offering.coverImage) {
                offeringsManager.uploadedImageS3Key = offering.coverImage;
            }
        }
        
        // Add details
        const details = offering.details || {};
        const detailsContainer = document.getElementById('details-rows');
        detailsContainer.innerHTML = ''; // Clear any existing rows
        
        if (Object.keys(details).length === 0) {
            // Add a couple of empty rows if no details
            addDetailRow();
            addDetailRow();
        } else {
            // Add rows for each detail
            Object.entries(details).forEach(([key, value]) => {
                addDetailRow(key, value);
            });
        }
    } catch (error) {
        console.error('Error loading offering for editing:', error);
        showNotification('Failed to load offering: ' + error.message, 'error');
        hideOfferingEditor();
    }
}

/**
 * Handle image upload (following the blog-editor pattern)
 */
async function handleOfferingImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Show loading state
        const progressContainer = document.getElementById('upload-progress');
        const progressBar = document.querySelector('.progress-bar');
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        
        // Compress image using the gallery compression method
        const compressedFile = await offeringsManager.imageCompressor.compressGalleryImage(file, {
            onProgress: (percent) => {
                progressBar.style.width = `${percent}%`;
            }
        });
        
        // 1. Get headers for authentication
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }
        
        const headers = getAuthHeaders();
        if (!headers) return;
        
        // 2. Request a presigned URL from the server
        const presignedResponse = await fetch('/gallery/upload', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                filename: compressedFile.name,
                contentType: compressedFile.type
            })
        });
        
        if (!presignedResponse.ok) throw new Error('Failed to get upload URL');
        
        const presignedData = await presignedResponse.json();
        console.log('Received presigned URL data for image:', presignedData);
        
        // 3. Upload the compressed file directly to S3 using the presigned URL
        const uploadResponse = await fetch(presignedData.uploadUrl, {
            method: 'PUT',
            body: compressedFile,
            headers: {
                'Content-Type': compressedFile.type
            }
        });
        
        if (!uploadResponse.ok) throw new Error('S3 upload failed');
        
        // 4. Get a presigned URL for the image to display in the preview
        const imageUrlResponse = await fetch(`/gallery/upload?key=${encodeURIComponent(presignedData.s3Key)}`);
        
        if (!imageUrlResponse.ok) throw new Error('Failed to get image URL');
        
        const imageUrlData = await imageUrlResponse.json();
        const imageUrl = imageUrlData.url;
        
        // 5. Update the preview with the new image
        document.getElementById('offering-image-preview').src = imageUrl;
        
        // Store the s3Key for saving with the offering
        offeringsManager.uploadedImageS3Key = presignedData.s3Key;
        
        // Hide progress after a delay
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
        
        showNotification('Image uploaded successfully', 'success');
    } catch (error) {
        console.error('Error handling image upload:', error);
        document.getElementById('upload-progress').style.display = 'none';
        showNotification('Failed to process image: ' + error.message, 'error');
        
        // Reset the image preview on error
        document.getElementById('offering-image-preview').src = '/static/images/placeholder-yoga.jpg';
    }
}

/**
 * Save offering to API
 */
async function saveOffering(event) {
    event.preventDefault();
    
    try {
        // Collect form data
        const name = document.getElementById('offering-name').value.trim();
        const type = document.getElementById('offering-type').value;
        const description = document.getElementById('offering-description').value.trim();
        const price = document.getElementById('offering-price').value.trim();
        const duration = document.getElementById('offering-duration').value.trim();
        const status = document.getElementById('offering-status').value;
        
        // Validate required fields
        if (!name || !type || !description) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Collect details
        const details = {};
        document.querySelectorAll('.detail-row').forEach(row => {
            const key = row.querySelector('.detail-key').value.trim();
            const value = row.querySelector('.detail-value').value.trim();
            if (key) {
                details[key] = value;
            }
        });
        
        // Prepare offering data
        const offeringData = {
            name,
            type,
            description,
            price,
            duration,
            status,
            details
        };
        
        // Show loading state
        const saveBtn = document.getElementById('save-offering-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        // Create or update offering
        let response;
        if (offeringsManager.isEditing) {
            // Update existing offering
            response = await fetch(`/offerings/${offeringsManager.currentOffering.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(offeringData)
            });
        } else {
            // Create new offering
            response = await fetch('/offerings', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(offeringData)
            });
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to save offering');
        }
        
        // If we have a new image S3 key from the upload earlier, include it in the offering data
        if (offeringsManager.uploadedImageS3Key) {
            // Update the offering with the image S3 key
            const imageUpdateResponse = await fetch(`/offerings/${data.offering.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    coverImage: offeringsManager.uploadedImageS3Key // Using the S3 key directly like blog editor
                })
            });
            
            const imageUpdateData = await imageUpdateResponse.json();
            if (!imageUpdateData.success) {
                console.warn('Failed to update offering with image reference:', imageUpdateData.message);
            }
        }
        
        // Refresh offerings list
        showNotification(
            offeringsManager.isEditing ? 'Offering updated successfully' : 'Offering created successfully', 
            'success'
        );
        
        hideOfferingEditor();
        loadOfferings();
    } catch (error) {
        console.error('Error saving offering:', error);
        showNotification('Failed to save offering: ' + error.message, 'error');
        
        // Reset button state
        const saveBtn = document.getElementById('save-offering-btn');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Offering';
    }
}


/**
 * Hide offering editor
 */
function hideOfferingEditor() {
    document.getElementById('offering-editor-container').style.display = 'none';
    document.querySelector('.offerings-list').style.display = 'block';
    offeringsManager.currentOffering = null;
    offeringsManager.isEditing = false;
    offeringsManager.uploadedImageFile = null;
    offeringsManager.uploadedImageS3Key = null;
}

/**
 * Edit offering
 */
function editOffering(offerId) {
    showOfferingEditor(offerId);
}

/**
 * Confirm and delete offering
 */
function confirmDeleteOffering(offerId) {
    if (confirm('Are you sure you want to delete this offering? This action cannot be undone.')) {
        deleteOffering(offerId);
    }
}

/**
 * Delete offering
 */
async function deleteOffering(offerId) {
    try {
        const response = await fetch(`/offerings/${offerId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to delete offering');
        }
        
        showNotification('Offering deleted successfully', 'success');
        loadOfferings();
    } catch (error) {
        console.error('Error deleting offering:', error);
        showNotification('Failed to delete offering: ' + error.message, 'error');
    }
}

// Helper function for getting auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return null;
    }
    return {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}
