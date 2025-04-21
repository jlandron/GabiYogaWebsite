/**
 * Admin Pricing JavaScript for Gabi Jyoti Yoga
 * 
 * This file handles the functionality for the pricing & offerings management page,
 * including memberships and private session packages.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Load pricing data from the API
    fetchMemberships();
    fetchSessionPackages();
    
    // Initialize modal functionality
    initializeMembershipModal();
    initializeSessionPackageModal();
    
    // Initialize save button
    document.getElementById('save-all-pricing').addEventListener('click', function() {
        // This is just a visual confirmation since we save each item individually
        showNotification('pricing-notification');
    });
    
    // Initialize add buttons
    document.getElementById('add-membership').addEventListener('click', function() {
        openMembershipModal();
    });
    
    document.getElementById('add-session-package').addEventListener('click', function() {
        openSessionPackageModal();
    });
    
    // Focus options management
    document.getElementById('add-focus-option').addEventListener('click', addFocusOption);
    
    // Add event listener to initial remove focus option button
    const removeButtons = document.querySelectorAll('.remove-focus-option');
    removeButtons.forEach(button => {
        button.addEventListener('click', removeFocusOption);
    });
    
    // Close modals when clicking on X or close/cancel buttons
    document.querySelectorAll('.admin-modal-close, #cancel-membership, #cancel-package').forEach(el => {
        el.addEventListener('click', function() {
            closeModals();
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const membershipModal = document.getElementById('membership-modal');
        const sessionPackageModal = document.getElementById('session-package-modal');
        
        if (event.target === membershipModal) {
            closeModal(membershipModal);
        }
        
        if (event.target === sessionPackageModal) {
            closeModal(sessionPackageModal);
        }
    });
});

/**
 * Fetch all membership types from the API
 */
function fetchMemberships() {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    // Show loading state
    const membershipsTable = document.querySelector('#memberships-table tbody');
    membershipsTable.innerHTML = '<tr><td colspan="6" class="admin-table-loading">Loading memberships...</td></tr>';
    
    fetch('/api/admin/pricing/memberships', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch memberships');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.memberships) {
            displayMemberships(data.memberships);
        } else {
            throw new Error(data.message || 'Failed to fetch memberships');
        }
    })
    .catch(error => {
        console.error('Error fetching memberships:', error);
        membershipsTable.innerHTML = `<tr><td colspan="6" class="admin-table-error">Error: ${error.message}</td></tr>`;
    });
}

/**
 * Display memberships in the table
 */
function displayMemberships(memberships) {
    const membershipsTable = document.querySelector('#memberships-table tbody');
    
    // Clear the table
    membershipsTable.innerHTML = '';
    
    if (memberships.length === 0) {
        membershipsTable.innerHTML = '<tr><td colspan="6" class="admin-table-empty">No memberships found. Add your first membership above.</td></tr>';
        return;
    }
    
    // Add memberships to table
    memberships.forEach(membership => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', membership.id);
        
        // Duration/Classes display
        let durationClasses = '';
        if (membership.duration_days) {
            durationClasses += `${membership.duration_days} days`;
        }
        if (membership.classes) {
            durationClasses += (durationClasses ? ', ' : '') + `${membership.classes} classes`;
        }
        if (!durationClasses) {
            durationClasses = 'N/A';
        }
        
        // Status badge
        const statusClass = membership.status === 'active' ? 'status-active' : 'status-inactive';
        const statusBadge = `<span class="status-badge ${statusClass}">${membership.status}</span>`;
        
        row.innerHTML = `
            <td>${escapeHTML(membership.type)}</td>
            <td>${escapeHTML(membership.description || 'N/A')}</td>
            <td>$${membership.price.toFixed(2)}</td>
            <td>${durationClasses}</td>
            <td>${statusBadge}</td>
            <td class="admin-table-actions">
                <button class="edit-membership" title="Edit membership"><i class="fas fa-edit"></i></button>
                <button class="delete-membership" title="Delete membership"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        
        membershipsTable.appendChild(row);
        
        // Add event listeners to edit and delete buttons
        row.querySelector('.edit-membership').addEventListener('click', function() {
            openMembershipModal(membership);
        });
        
        row.querySelector('.delete-membership').addEventListener('click', function() {
            confirmDeleteMembership(membership.id, membership.type);
        });
    });
}

/**
 * Fetch all session packages from the API
 */
function fetchSessionPackages() {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    // Show loading state
    const packagesTable = document.querySelector('#private-sessions-table tbody');
    packagesTable.innerHTML = '<tr><td colspan="6" class="admin-table-loading">Loading session packages...</td></tr>';
    
    fetch('/api/admin/pricing/session-packages', {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch session packages');
        }
        return response.json();
    })
    .then(data => {
        if (data.success && data.packages) {
            displaySessionPackages(data.packages);
        } else {
            throw new Error(data.message || 'Failed to fetch session packages');
        }
    })
    .catch(error => {
        console.error('Error fetching session packages:', error);
        packagesTable.innerHTML = `<tr><td colspan="6" class="admin-table-error">Error: ${error.message}</td></tr>`;
    });
}

/**
 * Display session packages in the table
 */
function displaySessionPackages(packages) {
    const packagesTable = document.querySelector('#private-sessions-table tbody');
    
    // Clear the table
    packagesTable.innerHTML = '';
    
    if (packages.length === 0) {
        packagesTable.innerHTML = '<tr><td colspan="6" class="admin-table-empty">No session packages found. Add your first package above.</td></tr>';
        return;
    }
    
    // Add packages to table
    packages.forEach(pkg => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', pkg.id);
        
        // Status badge
        const statusClass = pkg.status === 'active' ? 'status-active' : 'status-inactive';
        const statusBadge = `<span class="status-badge ${statusClass}">${pkg.status}</span>`;
        
        row.innerHTML = `
            <td>${escapeHTML(pkg.name)}</td>
            <td>${escapeHTML(pkg.description || 'N/A')}</td>
            <td>${pkg.sessions}</td>
            <td>$${pkg.price.toFixed(2)}</td>
            <td>${statusBadge}</td>
            <td class="admin-table-actions">
                <button class="edit-package" title="Edit package"><i class="fas fa-edit"></i></button>
                <button class="delete-package" title="Delete package"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        
        packagesTable.appendChild(row);
        
        // Add event listeners to edit and delete buttons
        row.querySelector('.edit-package').addEventListener('click', function() {
            openSessionPackageModal(pkg);
        });
        
        row.querySelector('.delete-package').addEventListener('click', function() {
            confirmDeleteSessionPackage(pkg.id, pkg.name);
        });
    });
}

/**
 * Initialize membership modal
 */
function initializeMembershipModal() {
    const form = document.getElementById('membership-form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const membershipId = document.getElementById('membership-id').value;
        const membershipData = {
            type: document.getElementById('membership-type').value,
            description: document.getElementById('membership-description').value,
            price: parseFloat(document.getElementById('membership-price').value),
            duration_days: document.getElementById('membership-duration').value 
                ? parseInt(document.getElementById('membership-duration').value) 
                : null,
            classes: document.getElementById('membership-classes').value 
                ? parseInt(document.getElementById('membership-classes').value) 
                : null,
            auto_renew_allowed: document.getElementById('membership-auto-renew').checked,
            status: document.getElementById('membership-status').value
        };
        
        if (membershipId) {
            // Update existing membership
            updateMembership(membershipId, membershipData);
        } else {
            // Create new membership
            createMembership(membershipData);
        }
    });
}

/**
 * Initialize session package modal
 */
function initializeSessionPackageModal() {
    const form = document.getElementById('session-package-form');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const packageId = document.getElementById('package-id').value;
        
        // Collect focus options
        const focusOptions = [];
        document.querySelectorAll('.focus-option').forEach(input => {
            if (input.value.trim()) {
                focusOptions.push(input.value.trim());
            }
        });
        
        const packageData = {
            name: document.getElementById('package-name').value,
            description: document.getElementById('package-description').value,
            sessions: parseInt(document.getElementById('package-sessions').value),
            price: parseFloat(document.getElementById('package-price').value),
            session_duration: parseInt(document.getElementById('package-duration').value),
            focus_options: focusOptions,
            status: document.getElementById('package-status').value
        };
        
        if (packageId) {
            // Update existing package
            updateSessionPackage(packageId, packageData);
        } else {
            // Create new package
            createSessionPackage(packageData);
        }
    });
}

/**
 * Open membership modal for editing or creating a membership
 */
function openMembershipModal(membership = null) {
    const modal = document.getElementById('membership-modal');
    const modalTitle = document.getElementById('membership-modal-title');
    const form = document.getElementById('membership-form');
    const idInput = document.getElementById('membership-id');
    
    // Reset form
    form.reset();
    
    if (membership) {
        // Editing existing membership
        modalTitle.textContent = 'Edit Membership';
        idInput.value = membership.id;
        
        document.getElementById('membership-type').value = membership.type;
        document.getElementById('membership-description').value = membership.description || '';
        document.getElementById('membership-price').value = membership.price;
        document.getElementById('membership-duration').value = membership.duration_days || '';
        document.getElementById('membership-classes').value = membership.classes || '';
        document.getElementById('membership-auto-renew').checked = !!membership.auto_renew_allowed;
        document.getElementById('membership-status').value = membership.status;
    } else {
        // Creating new membership
        modalTitle.textContent = 'Add New Membership';
        idInput.value = '';
    }
    
    modal.style.display = 'block';
}

/**
 * Open session package modal for editing or creating a package
 */
function openSessionPackageModal(pkg = null) {
    const modal = document.getElementById('session-package-modal');
    const modalTitle = document.getElementById('session-package-modal-title');
    const form = document.getElementById('session-package-form');
    const idInput = document.getElementById('package-id');
    const focusContainer = document.getElementById('focus-options-container');
    
    // Reset form
    form.reset();
    
    // Clear focus options
    focusContainer.innerHTML = '';
    
    if (pkg) {
        // Editing existing package
        modalTitle.textContent = 'Edit Session Package';
        idInput.value = pkg.id;
        
        document.getElementById('package-name').value = pkg.name;
        document.getElementById('package-description').value = pkg.description || '';
        document.getElementById('package-sessions').value = pkg.sessions;
        document.getElementById('package-price').value = pkg.price;
        document.getElementById('package-duration').value = pkg.session_duration;
        document.getElementById('package-status').value = pkg.status;
        
        // Add focus options
        const focusOptions = pkg.focus_options || [];
        if (focusOptions.length > 0) {
            focusOptions.forEach(option => {
                addFocusOptionRow(option);
            });
        } else {
            // Add an empty row
            addFocusOptionRow();
        }
    } else {
        // Creating new package
        modalTitle.textContent = 'Add New Session Package';
        idInput.value = '';
        
        // Add an empty focus option row
        addFocusOptionRow();
    }
    
    modal.style.display = 'block';
}

/**
 * Add a focus option row to the container
 */
function addFocusOptionRow(value = '') {
    const container = document.getElementById('focus-options-container');
    const row = document.createElement('div');
    row.className = 'focus-option-row';
    
    row.innerHTML = `
        <input type="text" class="admin-form-control focus-option" value="${escapeHTML(value)}" placeholder="e.g., Beginners Introduction">
        <button type="button" class="admin-btn admin-btn-icon remove-focus-option"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(row);
    
    // Add event listener to remove button
    row.querySelector('.remove-focus-option').addEventListener('click', removeFocusOption);
}

/**
 * Add a new focus option row
 */
function addFocusOption(e) {
    e.preventDefault();
    addFocusOptionRow();
}

/**
 * Remove a focus option row
 */
function removeFocusOption(e) {
    e.preventDefault();
    const button = e.target.closest('.remove-focus-option');
    const row = button.closest('.focus-option-row');
    
    // Don't remove the last row
    const container = document.getElementById('focus-options-container');
    if (container.children.length > 1) {
        row.remove();
    } else {
        // Clear the input instead
        row.querySelector('.focus-option').value = '';
    }
}

/**
 * Create a new membership
 */
function createMembership(membershipData) {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    fetch('/api/admin/pricing/memberships', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(membershipData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close the modal
            closeModal(document.getElementById('membership-modal'));
            
            // Show success notification
            showNotification('pricing-notification');
            
            // Refresh the memberships table
            fetchMemberships();
        } else {
            throw new Error(data.message || 'Failed to create membership');
        }
    })
    .catch(error => {
        console.error('Error creating membership:', error);
        alert('Error creating membership: ' + error.message);
    });
}

/**
 * Update an existing membership
 */
function updateMembership(membershipId, membershipData) {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    fetch(`/api/admin/pricing/memberships/${membershipId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(membershipData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close the modal
            closeModal(document.getElementById('membership-modal'));
            
            // Show success notification
            showNotification('pricing-notification');
            
            // Refresh the memberships table
            fetchMemberships();
        } else {
            throw new Error(data.message || 'Failed to update membership');
        }
    })
    .catch(error => {
        console.error('Error updating membership:', error);
        alert('Error updating membership: ' + error.message);
    });
}

/**
 * Delete a membership
 */
function deleteMembership(membershipId) {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    fetch(`/api/admin/pricing/memberships/${membershipId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('pricing-notification');
            
            // Refresh the memberships table
            fetchMemberships();
        } else {
            throw new Error(data.message || 'Failed to delete membership');
        }
    })
    .catch(error => {
        console.error('Error deleting membership:', error);
        alert('Error deleting membership: ' + error.message);
    });
}

/**
 * Confirm deletion of a membership
 */
function confirmDeleteMembership(membershipId, membershipType) {
    if (confirm(`Are you sure you want to delete the "${membershipType}" membership? This action cannot be undone.`)) {
        deleteMembership(membershipId);
    }
}

/**
 * Create a new session package
 */
function createSessionPackage(packageData) {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    fetch('/api/admin/pricing/session-packages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(packageData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close the modal
            closeModal(document.getElementById('session-package-modal'));
            
            // Show success notification
            showNotification('pricing-notification');
            
            // Refresh the packages table
            fetchSessionPackages();
        } else {
            throw new Error(data.message || 'Failed to create session package');
        }
    })
    .catch(error => {
        console.error('Error creating session package:', error);
        alert('Error creating session package: ' + error.message);
    });
}

/**
 * Update an existing session package
 */
function updateSessionPackage(packageId, packageData) {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    fetch(`/api/admin/pricing/session-packages/${packageId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(packageData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close the modal
            closeModal(document.getElementById('session-package-modal'));
            
            // Show success notification
            showNotification('pricing-notification');
            
            // Refresh the packages table
            fetchSessionPackages();
        } else {
            throw new Error(data.message || 'Failed to update session package');
        }
    })
    .catch(error => {
        console.error('Error updating session package:', error);
        alert('Error updating session package: ' + error.message);
    });
}

/**
 * Delete a session package
 */
function deleteSessionPackage(packageId) {
    const authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        console.error('No authentication token found.');
        return;
    }
    
    fetch(`/api/admin/pricing/session-packages/${packageId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success notification
            showNotification('pricing-notification');
            
            // Refresh the packages table
            fetchSessionPackages();
        } else {
            throw new Error(data.message || 'Failed to delete session package');
        }
    })
    .catch(error => {
        console.error('Error deleting session package:', error);
        alert('Error deleting session package: ' + error.message);
    });
}

/**
 * Confirm deletion of a session package
 */
function confirmDeleteSessionPackage(packageId, packageName) {
    if (confirm(`Are you sure you want to delete the "${packageName}" session package? This action cannot be undone.`)) {
        deleteSessionPackage(packageId);
    }
}

/**
 * Close all modals
 */
function closeModals() {
    const modals = document.querySelectorAll('.admin-modal');
    modals.forEach(modal => {
        closeModal(modal);
    });
}

/**
 * Close a specific modal
 */
function closeModal(modal) {
    modal.style.display = 'none';
}

/**
 * Show a success notification
 */
function showNotification(notificationId) {
    const notification = document.getElementById(notificationId);
    
    // Add active class to show notification
    notification.classList.add('active');
    
    // Remove active class after 3 seconds
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
