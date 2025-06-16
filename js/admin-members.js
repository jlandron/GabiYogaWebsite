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

  // Check token validity with backend using AdminApiService
  try {
    await AdminApiService.authRequest(`${API_BASE_URL}/auth/me`);
    console.log('Token verified with backend');
  } catch (error) {
    console.error('Token validation failed:', error);
    alert('Your session has expired. Please log in again.');
    UserService.logout();
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

  // View bookings buttons
  document.querySelectorAll('.view-bookings-btn').forEach(button => {
    button.addEventListener('click', function() {
      const memberId = this.getAttribute('data-member-id');
      viewMemberBookings(memberId);
    });
  });

  // View purchases buttons
  document.querySelectorAll('.view-purchases-btn').forEach(button => {
    button.addEventListener('click', function() {
      const memberId = this.getAttribute('data-member-id');
      viewMemberPurchases(memberId);
    });
  });

  // Send message buttons
  document.querySelectorAll('.send-message-btn').forEach(button => {
    button.addEventListener('click', function() {
      const memberId = this.getAttribute('data-member-id');
      openMessageComposer(memberId);
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

    // Check for biography updates in localStorage
    const bioUpdatesKey = `member_bio_${memberId}`;
    const bioUpdates = localStorage.getItem(bioUpdatesKey);
    if (bioUpdates) {
      // If there are updates, apply them to the member object
      member.bio = bioUpdates;
    }

    // Populate modal with member details
    populateMemberDetailModal(member, modal);

    // Setup close button
    setupModalCloseButtons(modal);
    
    // Setup biography edit button
    setupBioEditButton(modal);
    
    // Setup contact member button
    setupContactMemberButton(modal, member);
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

/**
 * View member bookings - Shows a modal with the member's class bookings
 */
async function viewMemberBookings(memberId) {
  try {
    // Create modal container if it doesn't exist
    let modal = document.getElementById('bookings-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bookings-modal';
      modal.className = 'admin-modal';
      document.body.appendChild(modal);
    }
    
    // Show loading state
    modal.innerHTML = `
      <div class="admin-modal-content">
        <div class="modal-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading booking history...</p>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
    
    // Fetch member info and bookings
    const memberResponse = await AdminApiService.getMemberById(memberId);
    const member = memberResponse.member;
    
    // In a real app, we would have a dedicated endpoint for bookings
    // For demo purposes, we'll simulate this with a delay
    const bookings = await new Promise((resolve) => {
      setTimeout(() => {
        // Simulated booking data - in a real app, this would come from an API call
        resolve([
          {
            booking_id: 101,
            class_name: 'Vinyasa Flow',
            instructor: 'Emily Johnson',
            date: '2025-04-25',
            time: '7:00 AM - 8:15 AM',
            status: 'Upcoming'
          },
          {
            booking_id: 99,
            class_name: 'Restorative Yoga',
            instructor: 'Michael Chen',
            date: '2025-04-22',
            time: '6:30 PM - 7:45 PM',
            status: 'Upcoming'
          },
          {
            booking_id: 95,
            class_name: 'Vinyasa Flow',
            instructor: 'Emily Johnson',
            date: '2025-04-18',
            time: '7:00 AM - 8:15 AM',
            status: 'Attended'
          },
          {
            booking_id: 87,
            class_name: 'Hatha Yoga',
            instructor: 'David Lee',
            date: '2025-04-15',
            time: '9:30 AM - 10:45 AM',
            status: 'Attended'
          },
          {
            booking_id: 76,
            class_name: 'Yin Yoga',
            instructor: 'Sarah Wong',
            date: '2025-04-08',
            time: '8:00 PM - 9:15 PM',
            status: 'Attended'
          }
        ]);
      }, 800); // Simulate network delay
    });
    
    // Generate bookings table HTML
    let bookingsHtml = '';
    if (bookings.length > 0) {
      bookingsHtml = bookings.map(booking => {
        // Determine status class for coloring
        let statusClass = '';
        switch(booking.status) {
          case 'Upcoming':
            statusClass = 'blue';
            break;
          case 'Attended':
            statusClass = 'green';
            break;
          case 'Missed':
            statusClass = 'red';
            break;
          case 'Cancelled':
            statusClass = 'yellow';
            break;
          default:
            statusClass = '';
        }
        
        return `
          <tr data-booking-id="${booking.booking_id}">
            <td>${booking.class_name}</td>
            <td>${booking.instructor}</td>
            <td>${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td>${booking.time}</td>
            <td><span class="admin-tag ${statusClass}">${booking.status}</span></td>
            <td class="table-actions">
              ${booking.status === 'Upcoming' ? 
                `<button class="admin-btn admin-btn-small cancel-booking-btn" data-booking-id="${booking.booking_id}">
                  <i class="fas fa-times"></i> Cancel
                </button>` : 
                ''
              }
              <button class="admin-btn admin-btn-small">
                <i class="fas fa-info-circle"></i> Details
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } else {
      bookingsHtml = `
        <tr>
          <td colspan="6" style="text-align: center;">No bookings found for this member.</td>
        </tr>
      `;
    }
    
    // Populate modal content
    modal.innerHTML = `
      <div class="admin-modal-content">
        <div class="admin-modal-header">
          <h2>Class Bookings - ${member.first_name} ${member.last_name}</h2>
          <button class="admin-modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="admin-modal-body">
          <div class="admin-panel">
            <div class="admin-panel-header">
              <h3>Booking History</h3>
              <div>
                <select class="admin-select booking-filter">
                  <option value="all">All Bookings</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="attended">Attended</option>
                  <option value="missed">Missed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Instructor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="bookings-table-body">
                ${bookingsHtml}
              </tbody>
            </table>
          </div>
        </div>
        <div class="admin-modal-footer">
          <button class="admin-btn admin-btn-secondary close-modal-btn">Close</button>
          <button class="admin-btn admin-btn-primary add-booking-btn">
            <i class="fas fa-plus"></i> Add New Booking
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners for close buttons
    setupModalCloseButtons(modal);
    
    // Add event listeners for cancel booking buttons
    setupCancelBookingButtons(modal);
    
    // Add event listener for the add booking button
    setupAddBookingButton(modal, memberId);
    
  } catch (error) {
    console.error('Error viewing member bookings:', error);
    showErrorMessage('Failed to load booking details. Please try again.');
  }
}

/**
 * Setup cancel booking buttons
 */
function setupCancelBookingButtons(modal) {
  modal.querySelectorAll('.cancel-booking-btn').forEach(button => {
    button.addEventListener('click', function() {
      const bookingId = this.getAttribute('data-booking-id');
      if (confirm('Are you sure you want to cancel this booking?')) {
        // In a real app, we would call an API endpoint to cancel the booking
        // For now, we'll simulate success
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.disabled = true;
        
        setTimeout(() => {
          // Update the status in the table
          const row = this.closest('tr');
          const statusCell = row.querySelector('td:nth-child(5)');
          statusCell.innerHTML = '<span class="admin-tag yellow">Cancelled</span>';
          
          // Remove the cancel button
          this.remove();
          
          showSuccessMessage('Booking successfully cancelled.');
        }, 800);
      }
    });
  });
}

/**
 * Setup add booking button
 */
function setupAddBookingButton(modal, memberId) {
  const addBookingBtn = modal.querySelector('.add-booking-btn');
  if (addBookingBtn) {
    addBookingBtn.addEventListener('click', function() {
      // This would typically open another modal with class selection
      // For now we'll just show a success message
      showSuccessMessage('Booking functionality will be implemented soon.');
      
      // In a real app, you might navigate to a booking page or open another modal:
      // window.location.href = `admin-schedule.html?booking=true&member=${memberId}`;
    });
  }
}

/**
 * View member purchases - Shows a modal with the member's purchase history
 */
async function viewMemberPurchases(memberId) {
  try {
    // Create modal container if it doesn't exist
    let modal = document.getElementById('purchases-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'purchases-modal';
      modal.className = 'admin-modal';
      document.body.appendChild(modal);
    }
    
    // Show loading state
    modal.innerHTML = `
      <div class="admin-modal-content">
        <div class="modal-loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading purchase history...</p>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
    
    // Fetch member info and purchases
    const memberResponse = await AdminApiService.getMemberById(memberId);
    const member = memberResponse.member;
    
    // In a real app, we would have a dedicated endpoint for purchases
    // For demo purposes, we'll simulate this with a delay
    const purchases = await new Promise((resolve) => {
      setTimeout(() => {
        // Simulated purchase data - in a real app, this would come from an API call
        resolve([
          {
            purchase_id: 205,
            date: '2025-04-15',
            item: 'Annual Membership',
            price: 1200.00,
            status: 'Active',
            payment_method: 'Credit Card (ending in 4321)'
          },
          {
            purchase_id: 189,
            date: '2025-03-22',
            item: 'Workshop: Inversions & Arm Balances',
            price: 45.00,
            status: 'Completed',
            payment_method: 'Credit Card (ending in 4321)'
          },
          {
            purchase_id: 174,
            date: '2025-02-10',
            item: 'Yoga Mat - Premium',
            price: 68.00,
            status: 'Completed',
            payment_method: 'Credit Card (ending in 4321)'
          },
          {
            purchase_id: 152,
            date: '2025-01-15',
            item: 'Monthly Membership',
            price: 120.00,
            status: 'Expired',
            payment_method: 'Credit Card (ending in 4321)'
          }
        ]);
      }, 800); // Simulate network delay
    });
    
    // Generate purchases table HTML
    let purchasesHtml = '';
    if (purchases.length > 0) {
      purchasesHtml = purchases.map(purchase => {
        // Determine status class for coloring
        let statusClass = '';
        switch(purchase.status) {
          case 'Active':
            statusClass = 'green';
            break;
          case 'Completed':
            statusClass = 'blue';
            break;
          case 'Refunded':
            statusClass = 'yellow';
            break;
          case 'Expired':
            statusClass = 'red';
            break;
          default:
            statusClass = '';
        }
        
        // Format price with currency
        const formattedPrice = new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(purchase.price);
        
        return `
          <tr data-purchase-id="${purchase.purchase_id}">
            <td>${new Date(purchase.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td>${purchase.item}</td>
            <td>${formattedPrice}</td>
            <td><span class="admin-tag ${statusClass}">${purchase.status}</span></td>
            <td>${purchase.payment_method}</td>
            <td class="table-actions">
              <button class="admin-btn admin-btn-small view-receipt-btn" data-purchase-id="${purchase.purchase_id}">
                <i class="fas fa-receipt"></i> Receipt
              </button>
              ${purchase.status === 'Active' ? 
                `<button class="admin-btn admin-btn-small">
                  <i class="fas fa-cog"></i> Manage
                </button>` : 
                ''}
            </td>
          </tr>
        `;
      }).join('');
    } else {
      purchasesHtml = `
        <tr>
          <td colspan="6" style="text-align: center;">No purchase history found for this member.</td>
        </tr>
      `;
    }
    
    // Calculate total spent
    const totalSpent = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
    const formattedTotal = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(totalSpent);
    
    // Populate modal content
    modal.innerHTML = `
      <div class="admin-modal-content">
        <div class="admin-modal-header">
          <h2>Purchase History - ${member.first_name} ${member.last_name}</h2>
          <button class="admin-modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="admin-modal-body">
          <div class="admin-summary-cards">
            <div class="admin-summary-card">
              <h3>Membership Status</h3>
              <p>${member.membership ? 
                `<span class="admin-tag green">Active - ${member.membership.type}</span>` : 
                '<span class="admin-tag red">No Active Membership</span>'}</p>
            </div>
            <div class="admin-summary-card">
              <h3>Total Purchases</h3>
              <p>${purchases.length}</p>
            </div>
            <div class="admin-summary-card">
              <h3>Total Spent</h3>
              <p>${formattedTotal}</p>
            </div>
          </div>
          
          <div class="admin-panel">
            <div class="admin-panel-header">
              <h3>Purchase History</h3>
              <div>
                <select class="admin-select purchase-filter">
                  <option value="all">All Purchases</option>
                  <option value="memberships">Memberships</option>
                  <option value="workshops">Workshops</option>
                  <option value="products">Products</option>
                </select>
              </div>
            </div>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Payment Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="purchases-table-body">
                ${purchasesHtml}
              </tbody>
            </table>
          </div>
        </div>
        <div class="admin-modal-footer">
          <button class="admin-btn admin-btn-secondary close-modal-btn">Close</button>
          <button class="admin-btn admin-btn-primary new-purchase-btn">
            <i class="fas fa-plus"></i> Add New Purchase
          </button>
        </div>
      </div>
    `;
    
    // Add event listeners for close buttons
    setupModalCloseButtons(modal);
    
    // Add event listeners for view receipt buttons
    setupViewReceiptButtons(modal);
    
    // Add event listener for the add purchase button
    setupAddPurchaseButton(modal, memberId);
    
  } catch (error) {
    console.error('Error viewing member purchases:', error);
    showErrorMessage('Failed to load purchase details. Please try again.');
  }
}

/**
 * Setup view receipt buttons
 */
function setupViewReceiptButtons(modal) {
  modal.querySelectorAll('.view-receipt-btn').forEach(button => {
    button.addEventListener('click', function() {
      const purchaseId = this.getAttribute('data-purchase-id');
      
      // In a real app, we would fetch the receipt from the server
      // For now, we'll just show a message
      showSuccessMessage(`Receipt for purchase #${purchaseId} will be available soon.`);
    });
  });
}

/**
 * Setup add purchase button
 */
function setupAddPurchaseButton(modal, memberId) {
  const addPurchaseBtn = modal.querySelector('.new-purchase-btn');
  if (addPurchaseBtn) {
    addPurchaseBtn.addEventListener('click', function() {
      // In a real app, this would open a form to create a new purchase
      // For now, we'll just show a message
      showSuccessMessage('Purchase functionality will be implemented soon.');
    });
  }
}

/**
 * Open message composer - Opens a modal for sending messages to a member
 */
function openMessageComposer(memberId) {
  try {
    // Fetch member data for the message composer
    AdminApiService.getMemberById(memberId).then(response => {
      const member = response.member;
      if (!member) {
        throw new Error('Member not found');
      }
      
      // Create modal container if it doesn't exist
      let modal = document.getElementById('message-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'message-modal';
        modal.className = 'admin-modal';
        document.body.appendChild(modal);
      }
      
      // Populate modal content
      modal.innerHTML = `
        <div class="admin-modal-content">
          <div class="admin-modal-header">
            <h2>Send Message to ${member.first_name} ${member.last_name}</h2>
            <button class="admin-modal-close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="admin-modal-body">
            <div class="admin-form">
              <div class="admin-form-group">
                <label for="message-subject">Subject</label>
                <input type="text" id="message-subject" class="admin-input" placeholder="Enter message subject">
              </div>
              <div class="admin-form-group">
                <label for="message-type">Message Type</label>
                <select id="message-type" class="admin-select">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="both">Email & SMS</option>
                </select>
              </div>
              <div class="admin-form-group">
                <label for="message-template">Use Template</label>
                <select id="message-template" class="admin-select">
                  <option value="none">No Template</option>
                  <option value="welcome">Welcome Message</option>
                  <option value="renewal">Membership Renewal</option>
                  <option value="workshop">Workshop Invitation</option>
                  <option value="schedule">Schedule Change</option>
                </select>
              </div>
              <div class="admin-form-group">
                <label for="message-content">Message</label>
                <textarea id="message-content" class="admin-textarea" rows="8" placeholder="Enter your message here..."></textarea>
              </div>
              <div class="admin-form-group">
                <div class="admin-checkbox-group">
                  <input type="checkbox" id="send-copy" class="admin-checkbox">
                  <label for="send-copy">Send me a copy</label>
                </div>
              </div>
            </div>
          </div>
          <div class="admin-modal-footer">
            <button class="admin-btn admin-btn-secondary close-modal-btn">Cancel</button>
            <button class="admin-btn admin-btn-primary send-message-action">
              <i class="fas fa-paper-plane"></i> Send Message
            </button>
          </div>
        </div>
      `;
      
      // Show the modal
      modal.style.display = 'flex';
      
      // Add event listeners for close buttons
      setupModalCloseButtons(modal);
      
      // Add event listener for the send message button
      setupSendMessageButton(modal, memberId);
      
      // Add event listener for message template selection
      setupMessageTemplateListener(modal);
      
    }).catch(error => {
      console.error('Error opening message composer:', error);
      showErrorMessage('Failed to open message composer. Please try again.');
    });
  } catch (error) {
    console.error('Error opening message composer:', error);
    showErrorMessage('Failed to open message composer. Please try again.');
  }
}

/**
 * Setup message template listener
 */
function setupMessageTemplateListener(modal) {
  const templateSelect = modal.querySelector('#message-template');
  const messageSubject = modal.querySelector('#message-subject');
  const messageContent = modal.querySelector('#message-content');
  
  if (!templateSelect || !messageSubject || !messageContent) return;
  
  templateSelect.addEventListener('change', function() {
    const selectedTemplate = this.value;
    
    switch (selectedTemplate) {
      case 'welcome':
        messageSubject.value = 'Welcome to Gabi Jyoti Yoga!';
        messageContent.value = 'Dear member,\n\n' +
          'Welcome to Gabi Jyoti Yoga! We are delighted to have you as part of our community. ' +
          'Your membership is now active, and you can start booking classes right away.\n\n' +
          'If you have any questions or need assistance, please don\'t hesitate to contact us.\n\n' +
          'Namaste,\nThe Gabi Jyoti Yoga Team';
        break;
      case 'renewal':
        messageSubject.value = 'Your Membership Renewal';
        messageContent.value = 'Dear member,\n\n' +
          'Your membership with Gabi Jyoti Yoga will expire soon. ' +
          'To continue enjoying all benefits of your membership, please renew it before the expiration date.\n\n' +
          'You can renew online through your member portal or visit us at the studio.\n\n' +
          'Thank you for being part of our community!\n\n' +
          'Namaste,\nThe Gabi Jyoti Yoga Team';
        break;
      case 'workshop':
        messageSubject.value = 'Special Workshop Invitation';
        messageContent.value = 'Dear member,\n\n' +
          'We are excited to invite you to our upcoming workshop: "Inversions & Arm Balances" ' +
          'taking place on May 15, 2025 from 2:00 PM to 4:30 PM.\n\n' +
          'This workshop is suitable for all levels and will focus on building strength and confidence ' +
          'for inversions and arm balances in a safe and supportive environment.\n\n' +
          'Space is limited, so reserve your spot early!\n\n' +
          'Namaste,\nThe Gabi Jyoti Yoga Team';
        break;
      case 'schedule':
        messageSubject.value = 'Schedule Change Notification';
        messageContent.value = 'Dear member,\n\n' +
          'We would like to inform you of an upcoming change to our class schedule.\n\n' +
          'Starting next week, our Tuesday evening Vinyasa Flow class will be moved from 6:30 PM ' +
          'to 7:00 PM to better accommodate our members\' schedules.\n\n' +
          'We appreciate your understanding and look forward to seeing you in class!\n\n' +
          'Namaste,\nThe Gabi Jyoti Yoga Team';
        break;
      default:
        // No template or clear template
        messageSubject.value = '';
        messageContent.value = '';
        break;
    }
  });
}

/**
 * Setup send message button
 */
function setupSendMessageButton(modal, memberId) {
  const sendButton = modal.querySelector('.send-message-action');
  if (!sendButton) return;
  
  sendButton.addEventListener('click', function() {
    const subject = modal.querySelector('#message-subject').value.trim();
    const content = modal.querySelector('#message-content').value.trim();
    const messageType = modal.querySelector('#message-type').value;
    
    // Basic validation
    if (!subject) {
      showErrorMessage('Please enter a subject for your message.');
      return;
    }
    
    if (!content) {
      showErrorMessage('Please enter a message content.');
      return;
    }
    
    // Show sending status
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    this.disabled = true;
    
    // In a real app, we would call an API to send the message
    // For now, we'll simulate success with a delay
    setTimeout(() => {
      // Reset button state
      this.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
      this.disabled = false;
      
      // Close the modal
      modal.style.display = 'none';
      
      // Show success message
      showSuccessMessage(`Message "${subject}" sent successfully.`);
    }, 1500);
  });
}

/**
 * Edit member biography - enables editing of the member bio in the profile modal
 */
function editMemberBio(modal) {
  const bioDiv = modal.querySelector('#modal-member-bio');
  const editBtn = modal.querySelector('.member-bio .admin-btn-secondary');
  
  if (!bioDiv || !editBtn) return;
  
  // Get current bio content
  const currentBio = bioDiv.innerHTML;
  
  // Replace div with textarea for editing
  bioDiv.innerHTML = `<textarea class="admin-textarea bio-editor" rows="8">${currentBio}</textarea>`;
  
  // Change button to Save
  editBtn.innerHTML = '<i class="fas fa-save"></i> Save Biography';
  
  // Remove old click handler and add new one
  editBtn.replaceWith(editBtn.cloneNode(true));
  modal.querySelector('.member-bio .admin-btn-secondary').addEventListener('click', () => saveMemberBio(modal, currentBio));
}

/**
 * Save member biography after editing
 */
function saveMemberBio(modal, originalContent) {
  const textarea = modal.querySelector('.bio-editor');
  const saveBtn = modal.querySelector('.member-bio .admin-btn-secondary');
  
  if (!textarea || !saveBtn) return;
  
  // Get edited content
  const updatedBio = textarea.value;
  
  // Show saving state
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  saveBtn.disabled = true;
  
  // Get the member ID from the data attribute
  const memberCard = document.querySelector(`.member-card[data-member-id="${memberIdForBioEdit}"]`);
  if (!memberCard) {
    console.error('Could not find member card for saving bio');
  }
  
  // In a real app, we would call an API to save the bio
  // For now, we'll simulate success with a delay and save to localStorage
  setTimeout(() => {
    // Save to localStorage so it persists between views
    if (memberIdForBioEdit) {
      localStorage.setItem(`member_bio_${memberIdForBioEdit}`, updatedBio);
    }
    
    // Update the bio div with new content
    const bioDiv = modal.querySelector('#modal-member-bio');
    if (bioDiv) {
      bioDiv.innerHTML = updatedBio;
    }
    
    // Change button back to Edit
    saveBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Biography';
    saveBtn.disabled = false;
    
    // Remove old click handler and add new one
    saveBtn.replaceWith(saveBtn.cloneNode(true));
    modal.querySelector('.member-bio .admin-btn-secondary').addEventListener('click', () => editMemberBio(modal));
    
    // Show success message
    showSuccessMessage('Member biography updated successfully.');
  }, 800);
}

/**
 * Setup biography edit button
 */
function setupBioEditButton(modal) {
  const editBioBtn = modal.querySelector('.member-bio .admin-btn-secondary');
  if (editBioBtn) {
    editBioBtn.addEventListener('click', function() {
      editMemberBio(modal);
    });
  }
}

/**
 * Setup contact member button
 */
function setupContactMemberButton(modal, member) {
  const contactBtn = modal.querySelector('.admin-modal-footer .admin-btn-primary');
  if (!contactBtn) return;
  
  contactBtn.addEventListener('click', function() {
    // Close the detail modal
    modal.style.display = 'none';
    
    // Open message composer modal
    openMessageComposer(member.user_id);
  });
}
