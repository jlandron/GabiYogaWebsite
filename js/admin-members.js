/**
 * Admin Members Management JavaScript
 * This file handles the display and interaction with member data for the admin interface
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check if user is logged in and is admin (from admin.js)
  if (!UserService.isLoggedIn() || !UserService.isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    // Initialize page
    await loadMemberSummary();
    await loadMemberProfiles();

    // Setup search functionality
    setupSearchFunctionality();

    // Setup filter functionality
    setupFilterFunctionality();

    // No need to setup modal here as it's handled by viewMemberDetail()

    // Setup export data functionality
    document.querySelector('.admin-btn-primary').addEventListener('click', exportMemberData);

  } catch (error) {
    console.error('Error initializing admin members page:', error);
    showErrorMessage('Failed to initialize page. Please try again.');
  }
});

/**
 * Load member summary data (cards at the top)
 */
async function loadMemberSummary() {
  try {
    // Fetch all members to calculate statistics
    const response = await AdminApiService.getMembers();
    const members = response.members || [];

    // Calculate summary statistics
    const totalMembers = members.length;
    
    // Get current date for calculations
    const currentDate = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);

    // Calculate new members this month
    const newMembersThisMonth = members.filter(member => {
      const memberSinceDate = new Date(member.member_since);
      return memberSinceDate >= oneMonthAgo;
    }).length;

    // Calculate percentage of annual members
    const annualMembers = members.filter(member => 
      member.membership && 
      member.membership.type && 
      member.membership.type.toLowerCase().includes('annual')
    );
    const annualPercentage = Math.round((annualMembers.length / totalMembers) * 100);

    // Calculate class attendance rate (this would ideally come from booking data)
    // For now, we'll use a placeholder calculation
    const attendanceRate = 76; // Placeholder - would calculate from actual booking data
    
    // Update the UI with real data
    document.querySelector('.admin-card:nth-child(1) .admin-card-value').textContent = totalMembers;
    document.querySelector('.admin-card:nth-child(2) .admin-card-value').textContent = newMembersThisMonth;
    document.querySelector('.admin-card:nth-child(3) .admin-card-value').textContent = `${annualPercentage}%`;
    document.querySelector('.admin-card:nth-child(4) .admin-card-value').textContent = `${attendanceRate}%`;

  } catch (error) {
    console.error('Error loading member summary:', error);
    showErrorMessage('Failed to load member summary. Please try again.');
  }
}

/**
 * Load and display member profiles
 */
async function loadMemberProfiles() {
  try {
    // Show loading spinner
    const membersContainer = document.querySelector('.member-profiles');
    membersContainer.innerHTML = `
      <div class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading member profiles...</p>
      </div>
    `;

    // Fetch all members
    const response = await AdminApiService.getMembers();
    const members = response.members || [];

    // Get filter value if any
    const filterSelect = document.querySelector('.admin-select');
    const filter = filterSelect ? filterSelect.value : 'All Members';
    
    // Apply filter
    let filteredMembers = members;
    if (filter !== 'All Members') {
      filteredMembers = filterMembers(members, filter);
    }

    // If no members, show message
    if (filteredMembers.length === 0) {
      membersContainer.innerHTML = `
        <div class="no-members-message">
          <i class="fas fa-users-slash"></i>
          <p>No members found matching the current filter.</p>
        </div>
      `;
      return;
    }

    // Render member cards
    membersContainer.innerHTML = filteredMembers.map(member => createMemberCard(member)).join('');

    // Add event listeners to member cards
    addMemberCardEventListeners();

  } catch (error) {
    console.error('Error loading member profiles:', error);
    showErrorMessage('Failed to load member profiles. Please try again.');
    
    // Show error state
    const membersContainer = document.querySelector('.member-profiles');
    membersContainer.innerHTML = `
      <div class="error-indicator">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Unable to load member data. Please try again later.</p>
      </div>
    `;
  }
}

/**
 * Filter members based on the selected filter
 */
function filterMembers(members, filter) {
  switch(filter) {
    case 'Monthly Members':
      return members.filter(member => 
        member.membership && 
        member.membership.type && 
        member.membership.type.toLowerCase().includes('month')
      );
    case 'Annual Members':
      return members.filter(member => 
        member.membership && 
        member.membership.type && 
        member.membership.type.toLowerCase().includes('annual')
      );
    case 'Class Pack Holders':
      return members.filter(member => 
        member.membership && 
        member.membership.classes_remaining !== null && 
        member.membership.classes_remaining > 0
      );
    case 'Recently Active':
      // For recently active, we'd ideally check booking history
      // For now just return most recent members
      return [...members].sort((a, b) => 
        new Date(b.member_since) - new Date(a.member_since)
      ).slice(0, 10);
    default:
      return members;
  }
}

/**
 * Create HTML for a member card
 */
function createMemberCard(member) {
  // Format the member's join date
  const joinDate = new Date(member.member_since);
  const formattedJoinDate = joinDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short'
  });

  // Generate a profile image - use a placeholder if none available
  const profileImage = member.profile_image || 'images/profile-placeholder.jpg';
  
  // For demo purposes, use random images from an avatar service
  // In production, you'd use the actual member profile image
  const randomImage = `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 100)}.jpg`;

  // Get the membership type or status to display
  let membershipType = 'No Active Membership';
  let lastClassDate = 'No classes attended';
  let favoriteClass = 'None recorded';

  if (member.membership) {
    if (member.membership.classes_remaining !== null) {
      membershipType = `Class Pack (${member.membership.classes_remaining} remaining)`;
    } else if (member.membership.type) {
      membershipType = member.membership.type;
    }
  }

  // Create a URL-friendly member ID for the data-member attribute
  const memberSlug = `${member.first_name.toLowerCase()}-${member.last_name.toLowerCase()}-${member.user_id}`;

  return `
    <div class="member-card" data-member-id="${member.user_id}">
      <div class="member-header">
        <div class="member-avatar">
          <img src="${randomImage}" alt="${member.first_name} ${member.last_name}">
        </div>
        <div class="member-info">
          <div class="member-name">${member.first_name} ${member.last_name}</div>
          <div class="member-email">${member.email}</div>
        </div>
      </div>
      <div class="member-details">
        <div class="member-detail-item">
          <i class="fas fa-id-card"></i> Member since: ${formattedJoinDate}
        </div>
        <div class="member-detail-item">
          <i class="fas fa-tag"></i> ${membershipType}
        </div>
        <div class="member-detail-item">
          <i class="fas fa-phone"></i> ${member.phone || 'No phone number'}
        </div>
        <div class="member-detail-item">
          <i class="fas fa-calendar-check"></i> Status: ${getMembershipStatusBadge(member.membership)}
        </div>
      </div>
      <div class="member-actions">
        <button title="View Profile" data-member="${memberSlug}" class="view-member-btn">
          <i class="fas fa-user"></i>
        </button>
        <button title="View Bookings" class="view-bookings-btn" data-member-id="${member.user_id}">
          <i class="fas fa-calendar-alt"></i>
        </button>
        <button title="View Purchases" class="view-purchases-btn" data-member-id="${member.user_id}">
          <i class="fas fa-receipt"></i>
        </button>
        <button title="Send Message" class="send-message-btn" data-member-id="${member.user_id}">
          <i class="fas fa-envelope"></i>
        </button>
      </div>
    </div>
  `;
}

/**
 * Get appropriate membership status badge
 */
function getMembershipStatusBadge(membership) {
  if (!membership) {
    return '<span class="admin-tag red">Inactive</span>';
  }

  if (membership.classes_remaining !== null && membership.classes_remaining > 0) {
    return '<span class="admin-tag green">Active</span>';
  }

  if (membership.end_date) {
    const endDate = new Date(membership.end_date);
    const currentDate = new Date();
    
    if (endDate < currentDate) {
      return '<span class="admin-tag red">Expired</span>';
    } else {
      // If expires in less than 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(currentDate.getDate() + 30);
      
      if (endDate < thirtyDaysFromNow) {
        return '<span class="admin-tag yellow">Expiring Soon</span>';
      } else {
        return '<span class="admin-tag green">Active</span>';
      }
    }
  }

  return '<span class="admin-tag blue">Unknown</span>';
}

/**
 * Add event listeners to member card buttons
 */
function addMemberCardEventListeners() {
  // View profile buttons
  document.querySelectorAll('.view-member-btn').forEach(button => {
    button.addEventListener('click', function() {
      const memberSlug = this.getAttribute('data-member');
      const memberId = this.closest('.member-card').getAttribute('data-member-id');
      viewMemberDetail(memberId);
    });
  });

  // View bookings buttons (placeholder)
  document.querySelectorAll('.view-bookings-btn').forEach(button => {
    button.addEventListener('click', function() {
      const memberId = this.getAttribute('data-member-id');
      alert(`View bookings for member ID ${memberId} - This functionality will be implemented soon.`);
    });
  });

  // View purchases buttons (placeholder)
  document.querySelectorAll('.view-purchases-btn').forEach(button => {
    button.addEventListener('click', function() {
      const memberId = this.getAttribute('data-member-id');
      alert(`View purchases for member ID ${memberId} - This functionality will be implemented soon.`);
    });
  });

  // Send message buttons (placeholder)
  document.querySelectorAll('.send-message-btn').forEach(button => {
    button.addEventListener('click', function() {
      const memberId = this.getAttribute('data-member-id');
      alert(`Send message to member ID ${memberId} - This functionality will be implemented soon.`);
    });
  });
}

/**
 * View member detail - open modal with member information
 */
async function viewMemberDetail(memberId) {
  try {
    const modal = document.getElementById('member-detail-modal');
    if (!modal) return;

    // Show loading state
    showModalLoading(modal);
    modal.style.display = 'flex';

    // Fetch detailed member info from API
    const response = await AdminApiService.getMemberById(memberId);
    const member = response.member;
    if (!member) {
      throw new Error('Member not found');
    }

    // Populate modal with member details
    populateMemberDetailModal(member, modal);

    // Setup close button
    setupModalCloseButtons(modal);
  } catch (error) {
    console.error('Error viewing member detail:', error);
    showErrorMessage('Failed to load member details. Please try again.');
    
    // Hide the modal
    const modal = document.getElementById('member-detail-modal');
    if (modal) modal.style.display = 'none';
  }
}

/**
 * Show loading state in the modal
 */
function showModalLoading(modal) {
  const modalContent = modal.querySelector('.member-detail-modal');
  if (modalContent) {
    modalContent.innerHTML = `
      <div class="modal-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading member details...</p>
      </div>
    `;
  }
}

/**
 * Populate modal with member details
 */
function populateMemberDetailModal(member, modal) {
  // For demo purposes, use random images from an avatar service
  const randomImage = `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'women' : 'men'}/${Math.floor(Math.random() * 100)}.jpg`;
  
  // Format the member's join date
  const joinDate = new Date(member.member_since);
  const formattedJoinDate = joinDate.toLocaleDateString('en-US', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  
  // Get current membership if any
  const currentMembership = member.memberships && member.memberships.length > 0 ? 
    member.memberships[0] : null;
  
  // Format membership details
  let membershipType = 'No Active Membership';
  let membershipStatus = 'Inactive';
  let statusClass = 'red';
  let renewalDate = 'N/A';
  let paymentMethod = 'None on file';
  
  if (currentMembership) {
    membershipType = currentMembership.type;
    
    if (currentMembership.classes_remaining !== null && currentMembership.classes_remaining > 0) {
      membershipStatus = 'Active';
      statusClass = 'green';
      renewalDate = 'N/A (Class Pack)';
    } else if (currentMembership.end_date) {
      const endDate = new Date(currentMembership.end_date);
      const currentDate = new Date();
      
      renewalDate = endDate.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      
      if (endDate < currentDate) {
        membershipStatus = 'Expired';
        statusClass = 'red';
      } else {
        membershipStatus = 'Active';
        statusClass = 'green';
        
        // Add auto-renew info if available
        if (currentMembership.auto_renew) {
          renewalDate += ' (Auto-Renews)';
        }
      }
    }
    
    // In a real system, you'd have payment info
    paymentMethod = 'Credit Card (ending in •••• ••)';
  }
  
  // Format attendance data
  let attendanceHtml = '';
  if (member.attendance && member.attendance.length > 0) {
    attendanceHtml = member.attendance.map(item => {
      // Format the date
      const attendanceDate = new Date(item.date);
      const formattedDate = attendanceDate.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
      
      return `
        <tr>
          <td>Class Attendance</td>
          <td>${formattedDate}</td>
          <td>${item.class_name} (${item.start_time})</td>
        </tr>
      `;
    }).join('');
  } else {
    attendanceHtml = `
      <tr>
        <td colspan="3" style="text-align: center;">No attendance records found.</td>
      </tr>
    `;
  }
  
  // Create modal content
  modal.innerHTML = `
    <div class="member-detail-modal">
      <div class="admin-modal-header">
        <h2>Member Profile</h2>
        <button class="admin-modal-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="member-detail-header">
        <div class="member-detail-avatar">
          <img id="modal-member-avatar" src="${member.profile_image || randomImage}" alt="${member.first_name} ${member.last_name}">
        </div>
        <div class="member-detail-info">
          <h2 id="modal-member-name">${member.first_name} ${member.last_name}</h2>
          <p id="modal-member-email">${member.email}</p>
          <p id="modal-member-phone">${member.phone || 'No phone number'}</p>
          <p id="modal-member-since">Member since: ${formattedJoinDate}</p>
        </div>
      </div>
      
      <div class="admin-panel">
        <div class="admin-panel-header">
          <h3>Membership Details</h3>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>Membership Type</label>
            <p id="modal-membership-type">${membershipType}</p>
          </div>
          <div class="admin-form-group">
            <label>Status</label>
            <p><span id="modal-membership-status" class="admin-tag ${statusClass}">${membershipStatus}</span></p>
          </div>
        </div>
        <div class="admin-form-row">
          <div class="admin-form-group">
            <label>Renewal Date</label>
            <p id="modal-renewal-date">${renewalDate}</p>
          </div>
          <div class="admin-form-group">
            <label>Payment Method</label>
            <p id="modal-payment-method">${paymentMethod}</p>
          </div>
        </div>
      </div>
      
      <div class="member-bio">
        <h3>Biography & Notes</h3>
        <div id="modal-member-bio">
          <p>No biography or notes have been added for this member.</p>
        </div>
        <div style="margin-top: 15px;">
          <button class="admin-btn admin-btn-secondary">
            <i class="fas fa-edit"></i> Edit Biography
          </button>
        </div>
      </div>
      
      <div class="admin-panel">
        <div class="admin-panel-header">
          <h3>Recent Activity</h3>
        </div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Date</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="modal-activity-list">
            ${attendanceHtml}
          </tbody>
        </table>
      </div>
      
      <div class="admin-modal-footer">
        <button class="admin-btn admin-btn-secondary close-modal-btn">Close</button>
        <button class="admin-btn admin-btn-primary">Contact Member</button>
      </div>
    </div>
  `;
}

/**
 * Setup modal close buttons
 */
function setupModalCloseButtons(modal) {
  // Close on X button
  const closeBtn = modal.querySelector('.admin-modal-close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      modal.style.display = 'none';
    };
  }
  
  // Close on "Close" button
  const closeModalBtn = modal.querySelector('.close-modal-btn');
  if (closeModalBtn) {
    closeModalBtn.onclick = function() {
      modal.style.display = 'none';
    };
  }
  
  // Close if clicking outside the modal content
  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}

/**
 * Setup search functionality
 */
function setupSearchFunctionality() {
  const searchInput = document.querySelector('.admin-search-input');
  const searchButton = document.querySelector('.admin-search .admin-btn-secondary');
  
  if (!searchInput || !searchButton) return;
  
  // Search on button click
  searchButton.addEventListener('click', performSearch);
  
  // Search on Enter key
  searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      performSearch();
    }
  });
}

/**
 * Perform search on member profiles
 */
async function performSearch() {
  try {
    const searchInput = document.querySelector('.admin-search-input');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
      // If search is empty, just reload all profiles
      await loadMemberProfiles();
      return;
    }
    
    // Show loading while searching
    const membersContainer = document.querySelector('.member-profiles');
    membersContainer.innerHTML = `
      <div class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Searching for members...</p>
      </div>
    `;
    
    // Get all members
    const response = await AdminApiService.getMembers();
    const members = response.members || [];
    
    // Filter members by search term
    const filteredMembers = members.filter(member => {
      const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
      const email = member.email.toLowerCase();
      const phone = member.phone || '';
      
      return fullName.includes(searchTerm) || 
             email.includes(searchTerm) || 
             phone.includes(searchTerm);
    });
    
    // Display filtered members
    if (filteredMembers.length === 0) {
      membersContainer.innerHTML = `
        <div class="no-members-message">
          <i class="fas fa-search"></i>
          <p>No members found matching "${searchTerm}"</p>
        </div>
      `;
    } else {
      membersContainer.innerHTML = filteredMembers.map(member => 
        createMemberCard(member)
      ).join('');
      
      // Re-add event listeners
      addMemberCardEventListeners();
    }
    
  } catch (error) {
    console.error('Error performing search:', error);
    showErrorMessage('Search failed. Please try again.');
  }
}

/**
 * Setup filter functionality
 */
function setupFilterFunctionality() {
  const filterSelect = document.querySelector('.admin-select');
  if (!filterSelect) return;
  
  filterSelect.addEventListener('change', async () => {
    await loadMemberProfiles();
  });
}

/**
 * Export member data as CSV
 */
function exportMemberData() {
  try {
    AdminApiService.getMembers().then(response => {
      const members = response.members || [];
      
      if (members.length === 0) {
        showErrorMessage('No member data to export.');
        return;
      }
      
      // Convert data to CSV format
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Add header row
      csvContent += 'ID,First Name,Last Name,Email,Phone,Member Since,Membership Type,Status,End Date,Classes Remaining\n';
      
      // Add data rows
      members.forEach(member => {
        // Format member data
        const membershipType = member.membership ? member.membership.type || 'None' : 'None';
        const endDate = member.membership && member.membership.end_date ? member.membership.end_date : '';
        const classesRemaining = member.membership && member.membership.classes_remaining !== null ? 
          member.membership.classes_remaining : '';
        const status = member.membership ? 'Active' : 'Inactive';
        const phone = member.phone ? member.phone.replace(/,/g, '') : ''; // Remove commas from phone to prevent CSV issues
        
        csvContent += `${member.user_id},${member.first_name},${member.last_name},${member.email},${phone},${member.member_since},${membershipType},${status},${endDate},${classesRemaining}\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `members_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      
      // Download the data
      link.click();
      document.body.removeChild(link);
      
      showSuccessMessage('Member data exported successfully.');
    });
  } catch (error) {
    console.error('Error exporting member data:', error);
    showErrorMessage('Failed to export member data. Please try again.');
  }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'admin-error-message';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  
  // Insert at the top of content
  const content = document.querySelector('.admin-content');
  if (content) {
    content.prepend(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'admin-success-message';
  successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  
  // Insert at the top of content
  const content = document.querySelector('.admin-content');
  if (content) {
    content.prepend(successDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      successDiv.remove();
    }, 5000);
  }
}
