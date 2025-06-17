/**
 * Gabi Jyoti Yoga - Admin Dashboard JavaScript
 * Handles admin functionality and database interactions
 */

// Use API_BASE_URL from account.js which loads before this script
// Additional admin-specific endpoints (extending the ones from account.js)
const ADMIN_API_ENDPOINTS = {
  // Member endpoints
  members: `${API_BASE_URL}/admin/members`,
  memberById: (id) => `${API_BASE_URL}/admin/members/${id}`,
  
  // Class endpoints
  classes: `${API_BASE_URL}/admin/classes`,
  classById: (id) => `${API_BASE_URL}/admin/classes/${id}`,
  classTemplates: `${API_BASE_URL}/admin/class-templates`,
  classTemplateById: (id) => `${API_BASE_URL}/admin/class-templates/${id}`,
  
  // Booking endpoints
  bookings: `${API_BASE_URL}/admin/bookings`,
  bookingById: (id) => `${API_BASE_URL}/admin/bookings/${id}`,
  
  // Workshop endpoints
  workshops: `${API_BASE_URL}/admin/workshops`,
  workshopById: (id) => `${API_BASE_URL}/admin/workshops/${id}`,
  workshopRegistrations: `${API_BASE_URL}/admin/workshop-registrations`,
  
  // Private session endpoints
  privateSessions: `${API_BASE_URL}/admin/private-sessions`,
  privateSessionById: (id) => `${API_BASE_URL}/admin/private-sessions/${id}`,
  
  // Stats endpoint
  dashboardStats: `${API_BASE_URL}/admin/stats`
};

// TokenService and UserService are available from account.js which loads before this script

// API service for admin operations
const AdminApiService = {
  /**
   * Make authenticated requests
   * Modified to prioritize session-based authentication and fail open for token issues
   */
  authRequest: async (url, method = 'GET', data = null) => {
    try {
      console.log(`Preparing ${method} request to ${url}`);
      
      // Detect environment
      const hostname = window.location.hostname;
      const isProduction = hostname === 'www.gabi.yoga' || hostname === 'gabi.yoga';
      if (isProduction) {
        console.log('AdminApiService: Production environment detected');
      }
      
      // Check if token exists - will now continue even if token is missing
      const token = TokenService.getToken();
      if (!token) {
        console.warn('No JWT token found - proceeding with session authentication only');
      }
      
      // Prepare headers - include token if available, but don't require it
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      };
      
      // Only add Authorization header if we have a token
      if (token) {
        console.log('Including JWT token in request headers');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('No JWT token available - relying on session cookies');
      }

      const options = {
        method,
        headers,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      console.log(`Sending ${method} request to ${url}`);
      // Log the request details for debugging
      console.log('Request options:', {
        method: options.method,
        headers: {
          ...options.headers,
          'Authorization': options.headers['Authorization'] ? 
            `Bearer ${options.headers['Authorization'].substring(7, 15)}...` : 'none'
        },
        credentials: options.credentials,
        bodyIncluded: !!options.body
      });
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        console.error(`Request failed with status: ${response.status}`);
        
        if (response.status === 401) {
          // Handle unauthorized (both token and session expired/invalid)
          console.warn('Authentication failed (401): Both JWT token and session are invalid');
          
          // At this point, the server has rejected both authentication methods
          console.error('Complete authentication failure - user needs to log in again');
          
          // Show error alert but don't redirect - this lets the user decide what to do
          alert('Your authentication session has expired. Please refresh the page or log in again.');
        }
        
        let errorMessage = `API request failed with status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Error details:', errorData);
        } catch (jsonError) {
          console.error('Could not parse error response as JSON');
        }
        
        throw new Error(errorMessage);
      }
      
      console.log(`Request to ${url} completed successfully`);
      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  },

  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    return AdminApiService.authRequest(ADMIN_API_ENDPOINTS.dashboardStats);
  },
  
  /**
   * Get all members
   */
  getMembers: async () => {
    return AdminApiService.authRequest(ADMIN_API_ENDPOINTS.members);
  },
  
  /**
   * Get a member by ID
   */
  getMemberById: async (memberId) => {
    return AdminApiService.authRequest(ADMIN_API_ENDPOINTS.memberById(memberId));
  },
  
  /**
   * Update a member
   */
  updateMember: async (memberId, memberData) => {
    return AdminApiService.authRequest(
      ADMIN_API_ENDPOINTS.memberById(memberId),
      'PUT',
      memberData
    );
  },
  
  /**
   * Get all class templates
   */
  getClassTemplates: async () => {
    const response = await AdminApiService.authRequest(ADMIN_API_ENDPOINTS.classTemplates);
    return response.templates || [];
  },
  
  /**
   * Create a new class template
   */
  createClassTemplate: async (templateData) => {
    return AdminApiService.authRequest(
      ADMIN_API_ENDPOINTS.classTemplates,
      'POST',
      templateData
    );
  },
  
  /**
   * Get all classes
   */
  getClasses: async () => {
    const response = await AdminApiService.authRequest(ADMIN_API_ENDPOINTS.classes);
    return response.classes || [];
  },
  
  /**
   * Create a new class
   */
  createClass: async (classData) => {
    return AdminApiService.authRequest(
      ADMIN_API_ENDPOINTS.classes,
      'POST',
      classData
    );
  },
  
  /**
   * Update a class
   */
  updateClass: async (classId, classData) => {
    return AdminApiService.authRequest(
      ADMIN_API_ENDPOINTS.classById(classId),
      'PUT',
      classData
    );
  },
  
  /**
   * Get recent bookings
   */
  getRecentBookings: async () => {
    return AdminApiService.authRequest(`${ADMIN_API_ENDPOINTS.bookings}?recent=true`);
  },
  
  /**
   * Get all bookings
   */
  getAllBookings: async () => {
    return AdminApiService.authRequest(ADMIN_API_ENDPOINTS.bookings);
  },
  
  /**
   * Get all workshops
   */
  getWorkshops: async () => {
    return AdminApiService.authRequest(ADMIN_API_ENDPOINTS.workshops);
  },
  
  /**
   * Get upcoming workshops
   */
  getUpcomingWorkshops: async () => {
    return AdminApiService.authRequest(`${ADMIN_API_ENDPOINTS.workshops}?upcoming=true`);
  },
  
  /**
   * Get private sessions
   */
  getPrivateSessions: async () => {
    return AdminApiService.authRequest(ADMIN_API_ENDPOINTS.privateSessions);
  }
};

// Dashboard functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Use centralized authentication handler for admin pages
  const authenticated = await AuthHandler.initAdminPage();
  if (!authenticated) {
    return; // AuthHandler will have already redirected as needed
  }
  
  // Setup logout button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      // Use AuthHandler.logout() to ensure we call the server's logout endpoint
      // and properly clean up local storage
      AuthHandler.logout();
    });
  }
  
  // Get the current page from the URL
  const currentPage = window.location.pathname.split('/').pop().split('.')[0];
  
  // Set active nav item based on current page
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    const linkPage = link.getAttribute('href').split('.')[0].replace('#', '');
    if (currentPage === 'admin-' + linkPage || 
        (currentPage === 'admin-dashboard' && linkPage === 'dashboard')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // For admin dashboard page, load dashboard data
  if (currentPage === 'admin-dashboard') {
    await loadDashboardData();
  }
  
  // For schedule page, load schedule data
  if (currentPage === 'admin-schedule') {
    await loadScheduleData();
    
    // Setup "View Published Schedule" button
    const viewPublishedBtn = document.getElementById('view-published-btn');
    if (viewPublishedBtn) {
      viewPublishedBtn.addEventListener('click', viewPublishedSchedule);
    }
    
    // Setup "Add New Class" button
    const addClassBtn = document.getElementById('add-class-btn');
    if (addClassBtn) {
      addClassBtn.addEventListener('click', () => {
        openClassModal();
      });
    }
  }
  
  // For members page, load members data
  if (currentPage === 'admin-members') {
    await loadMembersData();
  }
  
  // For workshops page, load workshops data
  if (currentPage === 'admin-workshops') {
    await loadWorkshopsData();
  }
  
  // For sessions page, load private sessions data
  if (currentPage === 'admin-sessions') {
    await loadSessionsData();
  }
});

/**
 * Load dashboard data from the database
 */
async function loadDashboardData() {
  try {
    // Show loading states
    document.querySelectorAll('.admin-card-value').forEach(el => {
      el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });
    
    showTableLoading('recent-bookings-table');
    showTableLoading('upcoming-workshops-table');
    
    // Fetch dashboard stats
    const statsData = await AdminApiService.getDashboardStats();
    
    // Update stat cards with real data
    document.querySelector('.admin-card:nth-child(1) .admin-card-value').textContent = 
      statsData.activeMembers || 0;
    document.querySelector('.admin-card:nth-child(2) .admin-card-value').textContent = 
      statsData.weeklyBookings || 0;
    document.querySelector('.admin-card:nth-child(3) .admin-card-value').textContent = 
      statsData.upcomingSessions || 0;
    document.querySelector('.admin-card:nth-child(4) .admin-card-value').textContent = 
      `$${statsData.monthlyRevenue || 0}`;
    
    // Fetch recent bookings
    const recentBookings = await AdminApiService.getRecentBookings();
    renderBookingsTable(recentBookings, 'recent-bookings-table');
    
    // Fetch upcoming workshops
    const upcomingWorkshops = await AdminApiService.getUpcomingWorkshops();
    renderWorkshopsTable(upcomingWorkshops, 'upcoming-workshops-table');
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showErrorMessage('Failed to load dashboard data. Please try again.');
  }
}

/**
 * Load schedule data from the database
 */
async function loadScheduleData() {
  try {
    // Show loading states
    showTableLoading('class-templates-table');
    
    const templates = await AdminApiService.getClassTemplates();
    renderClassTemplatesTable(templates, 'class-templates-table');
    
    // Load schedule builder data
    await loadScheduleBuilder();
    
  } catch (error) {
    console.error('Error loading schedule data:', error);
    showErrorMessage('Failed to load schedule data. Please try again.');
  }
}

/**
 * Load schedule builder with classes for the selected day
 */
async function loadScheduleBuilder() {
  try {
    const dayElements = document.querySelectorAll('.schedule-day');
    let activeDay = 1; // Default to Monday (1)
    
    // Find active day
    dayElements.forEach(el => {
      if (el.classList.contains('active')) {
        // Get day number from data attribute or element content
        const dayText = el.getAttribute('data-day-number') || el.textContent;
        switch (dayText.toLowerCase()) {
          case 'sunday': activeDay = 0; break;
          case 'monday': activeDay = 1; break;
          case 'tuesday': activeDay = 2; break;
          case 'wednesday': activeDay = 3; break;
          case 'thursday': activeDay = 4; break;
          case 'friday': activeDay = 5; break;
          case 'saturday': activeDay = 6; break;
        }
      }
    });
    
    // Show loading state
    const timeslotsContainer = document.querySelector('.schedule-timeslots');
    if (timeslotsContainer) {
      timeslotsContainer.innerHTML = 
        '<div style="text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading schedule...</div>';
    }
    
    // Fetch classes for the selected day
    const classes = await AdminApiService.getClasses();
    const dayClasses = classes.filter(cls => cls.day_of_week === activeDay);
    
    // Build schedule timeslots
    renderScheduleTimeslots(dayClasses, timeslotsContainer);
    
    // Add event listeners for day selection
    dayElements.forEach(el => {
      el.addEventListener('click', function() {
        // Remove active class from all days
        dayElements.forEach(day => day.classList.remove('active'));
        
        // Add active class to clicked day
        this.classList.add('active');
        
        // Reload schedule for the selected day
        loadScheduleBuilder();
      });
    });
    
  } catch (error) {
    console.error('Error loading schedule builder:', error);
    const timeslotsContainer = document.querySelector('.schedule-timeslots');
    if (timeslotsContainer) {
      timeslotsContainer.innerHTML = 
        '<div style="text-align:center;padding:30px;color:#e74c3c;">Failed to load schedule. Please try again.</div>';
    }
  }
}

/**
 * Load members data from the database
 */
async function loadMembersData() {
  try {
    showTableLoading('members-table');
    
    // Fetch members
    const members = await AdminApiService.getMembers();
    renderMembersTable(members, 'members-table');
    
  } catch (error) {
    console.error('Error loading members data:', error);
    showErrorMessage('Failed to load members data. Please try again.');
  }
}

/**
 * Load workshops data from the database
 */
async function loadWorkshopsData() {
  try {
    showTableLoading('workshops-table');
    
    // Fetch workshops
    const workshops = await AdminApiService.getWorkshops();
    renderWorkshopsTable(workshops, 'workshops-table');
    
  } catch (error) {
    console.error('Error loading workshops data:', error);
    showErrorMessage('Failed to load workshops data. Please try again.');
  }
}

/**
 * Load private sessions data from the database
 */
async function loadSessionsData() {
  try {
    showTableLoading('sessions-table');
    
    // Fetch private sessions
    const sessions = await AdminApiService.getPrivateSessions();
    renderSessionsTable(sessions, 'sessions-table');
    
  } catch (error) {
    console.error('Error loading sessions data:', error);
    showErrorMessage('Failed to load sessions data. Please try again.');
  }
}

/**
 * Show loading state in a table
 */
function showTableLoading(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (tbody) {
    const columns = table.querySelectorAll('thead th').length || 4;
    tbody.innerHTML = `
      <tr>
        <td colspan="${columns}" style="text-align:center;padding:30px;">
          <i class="fas fa-spinner fa-spin"></i> Loading data...
        </td>
      </tr>
    `;
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
 * Render bookings table
 */
function renderBookingsTable(bookings, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:20px;">
          No bookings available.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = bookings.map(booking => {
    // Format date and time
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
    
    // Format time (if available)
    let timeDisplay = '';
    if (booking.start_time) {
      timeDisplay = ` - ${booking.start_time}`;
    }
    
    return `
      <tr>
        <td>${booking.user_name}</td>
        <td>${booking.class_name}</td>
        <td>${formattedDate}${timeDisplay}</td>
        <td>
          <span class="admin-tag ${getStatusColor(booking.status)}">
            ${booking.status}
          </span>
        </td>
        <td class="admin-table-actions">
          <button class="view" data-id="${booking.booking_id}" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button class="edit" data-id="${booking.booking_id}" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete" data-id="${booking.booking_id}" title="Cancel">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Add event listeners to action buttons
  addTableActionListeners(tbody, 'booking');
}

/**
 * Render workshops table
 */
function renderWorkshopsTable(workshops, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  if (!workshops || workshops.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:20px;">
          No workshops available.
        </td>
      </tr>
    `;
    return;
  }
  
  // Check if this is the regular workshops table or the upcoming workshops table
  const isUpcoming = table.classList.contains('upcoming-workshops') || tableId === 'upcoming-workshops-table';
  
  tbody.innerHTML = workshops.map(workshop => {
    // Format date
    const workshopDate = new Date(workshop.date);
    const formattedDate = workshopDate.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
    
    if (isUpcoming) {
      return `
        <tr>
          <td>${workshop.title}</td>
          <td>${formattedDate}</td>
          <td>${workshop.start_time} - ${workshop.end_time}</td>
          <td>${workshop.registration_count || 0}</td>
          <td>${workshop.capacity}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td>${workshop.title}</td>
          <td>${formattedDate}</td>
          <td>${workshop.start_time} - ${workshop.end_time}</td>
          <td>${workshop.registration_count || 0} / ${workshop.capacity}</td>
          <td class="admin-table-actions">
            <button class="view" data-id="${workshop.workshop_id}" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button class="edit" data-id="${workshop.workshop_id}" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete" data-id="${workshop.workshop_id}" title="Cancel">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `;
    }
  }).join('');
  
  // Add event listeners to action buttons
  if (!isUpcoming) {
    addTableActionListeners(tbody, 'workshop');
  }
}

/**
 * Render class templates table
 */
function renderClassTemplatesTable(templates, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  if (!templates || templates.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:20px;">
          No class templates available.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = templates.map(template => {
    return `
      <tr>
        <td>${template.name}</td>
        <td>${template.duration} min</td>
        <td>${template.level}</td>
        <td>${template.default_instructor}</td>
        <td class="admin-table-actions">
          <button class="use" data-id="${template.template_id}" title="Use Template">
            <i class="fas fa-plus-circle"></i>
          </button>
          <button class="edit" data-id="${template.template_id}" title="Edit Template">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete" data-id="${template.template_id}" title="Delete Template">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Add event listeners for template actions
  addTemplateActionListeners(tbody);
}

/**
 * Render members table
 */
function renderMembersTable(members, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  if (!members || members.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:20px;">
          No members available.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = members.map(member => {
    // Format join date
    const joinDate = new Date(member.member_since);
    const formattedJoinDate = joinDate.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
    
    return `
      <tr>
        <td>${member.first_name} ${member.last_name}</td>
        <td>${member.email}</td>
        <td>${member.phone || '-'}</td>
        <td>${formattedJoinDate}</td>
        <td>${getMembershipStatus(member)}</td>
        <td class="admin-table-actions">
          <button class="view" data-id="${member.user_id}" title="View Profile">
            <i class="fas fa-eye"></i>
          </button>
          <button class="edit" data-id="${member.user_id}" title="Edit Member">
            <i class="fas fa-edit"></i>
          </button>
          <button class="message" data-id="${member.user_id}" title="Send Message">
            <i class="fas fa-envelope"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Add event listeners to action buttons
  addTableActionListeners(tbody, 'member');
}

/**
 * Render sessions table
 */
function renderSessionsTable(sessions, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (!tbody) return;
  
  if (!sessions || sessions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:20px;">
          No private sessions available.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = sessions.map(session => {
    // Format date
    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
    
    return `
      <tr>
        <td>${session.user_name}</td>
        <td>${formattedDate}</td>
        <td>${session.start_time}</td>
        <td>${session.focus}</td>
        <td>
          <span class="admin-tag ${getStatusColor(session.status)}">
            ${session.status}
          </span>
        </td>
        <td class="admin-table-actions">
          <button class="view" data-id="${session.session_id}" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          ${getSessionActionButtons(session)}
        </td>
      </tr>
    `;
  }).join('');
  
  // Add event listeners to action buttons
  addTableActionListeners(tbody, 'session');
}

/**
 * Render schedule timeslots
 */
function renderScheduleTimeslots(classes, container) {
  if (!container) return;
  
  // Sort classes by start time
  classes.sort((a, b) => {
    const timeA = a.start_time.split(':').map(Number);
    const timeB = b.start_time.split(':').map(Number);
    
    if (timeA[0] !== timeB[0]) {
      return timeA[0] - timeB[0]; // Compare hours
    }
    return timeA[1] - timeB[1]; // Compare minutes
  });
  
  // Define default time slots if there are no classes
  const defaultTimeSlots = ['7:00 AM', '9:00 AM', '12:00 PM', '4:30 PM', '6:00 PM', '7:30 PM'];
  
  // Generate time slots based on existing classes or default times
  const timeSlots = classes.length > 0 
    ? classes.map(cls => {
        // Format the time from 24h to 12h format
        const [hours, minutes] = cls.start_time.split(':');
        const h = parseInt(hours) % 12 || 12;
        const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
        return {
          time: `${h}:${minutes} ${ampm}`,
          class: cls
        };
      })
    : defaultTimeSlots.map(time => ({ time, class: null }));
  
  // Generate HTML for timeslots
  container.innerHTML = timeSlots.map(slot => {
    if (slot.class) {
      // Slot has a class
      return `
        <div class="schedule-timeslot">
          <div class="schedule-time">${slot.time}</div>
          <div class="schedule-class">
            <strong>${slot.class.name}</strong>
            <div>Instructor: ${slot.class.instructor}</div>
          </div>
          <div class="schedule-actions">
            <button class="admin-btn-icon edit-class" data-id="${slot.class.class_id}" title="Edit Class">
              <i class="fas fa-edit"></i>
            </button>
            <button class="admin-btn-icon delete-class" data-id="${slot.class.class_id}" title="Remove Class">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      // Empty slot
      return `
        <div class="schedule-timeslot">
          <div class="schedule-time">${slot.time}</div>
          <div class="schedule-class empty">
            <i class="fas fa-plus"></i> Add Class
          </div>
          <div class="schedule-actions"></div>
        </div>
      `;
    }
  }).join('');
  
  // Add event listeners to edit buttons
  container.querySelectorAll('.edit-class').forEach(button => {
    button.addEventListener('click', () => {
      const classId = button.getAttribute('data-id');
      editClass(classId);
    });
  });
  
  // Add event listeners to delete buttons
  container.querySelectorAll('.delete-class').forEach(button => {
    button.addEventListener('click', () => {
      const classId = button.getAttribute('data-id');
      deleteClass(classId);
    });
  });
  
  // Add event listeners to empty slots
  container.querySelectorAll('.schedule-class.empty').forEach(slot => {
    slot.addEventListener('click', () => {
      const timeSlot = slot.closest('.schedule-timeslot').querySelector('.schedule-time').textContent;
      addNewClass(timeSlot);
    });
  });
}

/**
 * Add event listeners to table action buttons
 */
function addTableActionListeners(tbody, itemType) {
  // View button handlers
  tbody.querySelectorAll('.view').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      viewItem(itemType, id);
    });
  });
  
  // Edit button handlers
  tbody.querySelectorAll('.edit').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      editItem(itemType, id);
    });
  });
  
  // Delete button handlers
  tbody.querySelectorAll('.delete').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      deleteItem(itemType, id);
    });
  });
  
  // Message button handlers (for members)
  tbody.querySelectorAll('.message').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      messageMember(id);
    });
  });
  
  // Confirm button handlers (for sessions)
  tbody.querySelectorAll('.confirm').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      confirmSession(id);
    });
  });
  
  // Reschedule button handlers (for sessions)
  tbody.querySelectorAll('.reschedule').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      rescheduleSession(id);
    });
  });
}

/**
 * Add event listeners for template actions
 */
function addTemplateActionListeners(tbody) {
  // Use template button handlers
  tbody.querySelectorAll('.use').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      useTemplate(id);
    });
  });
  
  // Edit template button handlers
  tbody.querySelectorAll('.edit').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      editTemplate(id);
    });
  });
  
  // Delete template button handlers
  tbody.querySelectorAll('.delete').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      deleteTemplate(id);
    });
  });
}

/**
 * Get status color class for tags
 */
function getStatusColor(status) {
  if (!status) return '';
  
  status = status.toLowerCase();
  
  if (status === 'confirmed' || status === 'active' || status === 'completed') {
    return 'green';
  } else if (status === 'pending' || status === 'tentative') {
    return 'yellow';
  } else if (status === 'cancelled' || status === 'expired') {
    return 'red';
  } else if (status === 'new') {
    return 'blue';
  }
  
  return '';
}

/**
 * Get membership status display text
 */
function getMembershipStatus(member) {
  // If no membership data, return 'No Membership'
  if (!member.membership) {
    return 'No Active Membership';
  }
  
  // Format membership info
  const membershipType = member.membership.type;
  
  if (member.membership.classes_remaining !== null) {
    return `${membershipType}: ${member.membership.classes_remaining} classes left`;
  } else if (member.membership.end_date) {
    // Format end date
    const endDate = new Date(member.membership.end_date);
    const formattedEndDate = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    // Check if membership has auto-renew
    const autoRenew = member.membership.auto_renew ? ' (Auto-Renews)' : '';
    
    return `${membershipType}: Expires ${formattedEndDate}${autoRenew}`;
  } else {
    return membershipType;
  }
}

/**
 * Get appropriate action buttons for private sessions
 */
function getSessionActionButtons(session) {
  const status = session.status.toLowerCase();
  
  if (status === 'pending') {
    return `
      <button class="confirm" data-id="${session.session_id}" title="Confirm">
        <i class="fas fa-check"></i>
      </button>
      <button class="reschedule" data-id="${session.session_id}" title="Reschedule">
        <i class="fas fa-calendar-alt"></i>
      </button>
      <button class="delete" data-id="${session.session_id}" title="Cancel">
        <i class="fas fa-times"></i>
      </button>
    `;
  } else if (status === 'confirmed') {
    return `
      <button class="reschedule" data-id="${session.session_id}" title="Reschedule">
        <i class="fas fa-calendar-alt"></i>
      </button>
      <button class="delete" data-id="${session.session_id}" title="Cancel">
        <i class="fas fa-times"></i>
      </button>
    `;
  } else {
    return `
      <button class="edit" data-id="${session.session_id}" title="Edit">
        <i class="fas fa-edit"></i>
      </button>
    `;
  }
}

/**
 * View item details (placeholder function for now)
 */
function viewItem(itemType, id) {
  console.log(`View ${itemType} with ID: ${id}`);
  alert(`View ${itemType} details (ID: ${id}) - This functionality will be implemented soon.`);
}

/**
 * Edit item (placeholder function for now)
 */
function editItem(itemType, id) {
  console.log(`Edit ${itemType} with ID: ${id}`);
  alert(`Edit ${itemType} (ID: ${id}) - This functionality will be implemented soon.`);
}

/**
 * Delete item (placeholder function for now)
 */
function deleteItem(itemType, id) {
  console.log(`Delete ${itemType} with ID: ${id}`);
  if (confirm(`Are you sure you want to delete this ${itemType}? This action cannot be undone.`)) {
    alert(`Delete ${itemType} (ID: ${id}) - This functionality will be implemented soon.`);
  }
}

/**
 * Message a member (placeholder function for now)
 */
function messageMember(id) {
  console.log(`Message member with ID: ${id}`);
  alert(`Send message to member (ID: ${id}) - This functionality will be implemented soon.`);
}

/**
 * Get status color class for tags
 * This function is used by both admin.js and admin-sessions.js
 */
function getStatusColor(status) {
  if (!status) return '';
  
  status = status.toLowerCase();
  
  if (status === 'confirmed' || status === 'active' || status === 'completed') {
    return 'green';
  } else if (status === 'pending' || status === 'tentative') {
    return 'yellow';
  } else if (status === 'cancelled' || status === 'expired') {
    return 'red';
  } else if (status === 'new') {
    return 'blue';
  }
  
  return '';
}

/**
 * Confirm a private session (placeholder function for now)
 * This function is replaced by the implementation in admin-sessions.js
 */
function confirmSession(id) {
  // If we're not on the sessions page, use the placeholder
  if (!window.location.pathname.includes('admin-sessions')) {
    console.log(`Confirm session with ID: ${id}`);
    if (confirm(`Are you sure you want to confirm this private session?`)) {
      alert(`Confirm session (ID: ${id}) - This functionality will be implemented soon.`);
    }
  }
}

/**
 * Reschedule a private session (placeholder function for now)
 * This function is replaced by the implementation in admin-sessions.js
 */
function rescheduleSession(id) {
  // If we're not on the sessions page, use the placeholder
  if (!window.location.pathname.includes('admin-sessions')) {
    console.log(`Reschedule session with ID: ${id}`);
    alert(`Reschedule session (ID: ${id}) - This functionality will be implemented soon.`);
  }
}

/**
 * View published schedule
 */
function viewPublishedSchedule() {
  // Open the public-facing schedule page in a new tab
  window.open('index.html#schedule', '_blank');
}

/**
 * Open the class modal for adding a new class
 */
function openClassModal(classData = null) {
  const modal = document.getElementById('class-modal');
  const modalTitle = document.getElementById('class-modal-title');
  const form = document.getElementById('class-form');
  const classIdInput = document.getElementById('class-id');
  
  // Reset form
  if (form) {
    form.reset();
  }
  
  // Set modal title and class ID
  if (classData) {
    modalTitle.textContent = 'Edit Class';
    classIdInput.value = classData.class_id;
    
    // Fill form with class data
    document.getElementById('class-name').value = classData.name;
    document.getElementById('class-template').value = classData.template_id || '';
    document.getElementById('class-day').value = classData.day_of_week;
    document.getElementById('class-time').value = classData.start_time;
    document.getElementById('class-duration').value = classData.duration;
    document.getElementById('class-capacity').value = classData.capacity;
    document.getElementById('class-instructor').value = classData.instructor;
    document.getElementById('class-level').value = classData.level || 'All Levels';
    document.getElementById('class-description').value = classData.description || '';
    document.getElementById('class-active').checked = classData.active;
  } else {
    modalTitle.textContent = 'Add New Class';
    classIdInput.value = '';
    
    // Set default values
    const activeDay = document.querySelector('.schedule-day.active');
    if (activeDay) {
      document.getElementById('class-day').value = activeDay.getAttribute('data-day-number') || '1';
    }
  }
  
  // Load templates into dropdown
  loadTemplatesIntoDropdown();
  
  // Show modal
  modal.style.display = 'block';
  
  // Setup form submission
  form.onsubmit = async (e) => {
    e.preventDefault();
    await saveClass(form);
  };
  
  // Setup close button
  const closeBtn = modal.querySelector('.admin-modal-close');
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
  
  // Setup cancel button
  const cancelBtn = modal.querySelector('.admin-modal-cancel');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
  
  // Close modal if clicked outside
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
}

/**
 * Load templates into dropdown
 */
async function loadTemplatesIntoDropdown() {
  const dropdown = document.getElementById('class-template');
  if (!dropdown) return;
  
  try {
    // Clear dropdown except first option
    while (dropdown.options.length > 1) {
      dropdown.remove(1);
    }
    
    // Load templates
    const templates = await AdminApiService.getClassTemplates();
    
    // Add templates to dropdown
    templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.template_id;
      option.textContent = template.name;
      dropdown.appendChild(option);
    });
    
    // Add change event to populate fields from template
    dropdown.onchange = async () => {
      const templateId = dropdown.value;
      if (!templateId) return;
      
      // Find template
      const template = templates.find(t => t.template_id == templateId);
      if (!template) return;
      
      // Fill fields from template
      document.getElementById('class-name').value = template.name;
      document.getElementById('class-duration').value = template.duration;
      document.getElementById('class-level').value = template.level;
      document.getElementById('class-instructor').value = template.default_instructor;
      document.getElementById('class-description').value = template.description || '';
    };
  } catch (error) {
    console.error('Error loading templates:', error);
    showErrorMessage('Failed to load class templates');
  }
}

/**
 * Save class data
 */
async function saveClass(form) {
  try {
    const formData = new FormData(form);
    const classData = {
      template_id: formData.get('template_id') || null,
      name: formData.get('name'),
      day_of_week: parseInt(formData.get('day_of_week')),
      start_time: formData.get('start_time'),
      duration: parseInt(formData.get('duration')),
      instructor: formData.get('instructor'),
      level: formData.get('level'),
      capacity: parseInt(formData.get('capacity')),
      description: formData.get('description'),
      active: formData.get('active') === 'on'
    };
    
    const classId = formData.get('class_id');
    let result;
    
    if (classId) {
      // Update existing class
      result = await AdminApiService.updateClass(classId, classData);
      showSuccessMessage('Class updated successfully');
    } else {
      // Create new class
      result = await AdminApiService.createClass(classData);
      showSuccessMessage('Class created successfully');
    }
    
    // Hide modal
    document.getElementById('class-modal').style.display = 'none';
    
    // Reload schedule
    await loadScheduleBuilder();
  } catch (error) {
    console.error('Error saving class:', error);
    showErrorMessage('Failed to save class. Please try again.');
  }
}

/**
 * Edit a class
 */
async function editClass(id) {
  try {
    // Get class data
    const classes = await AdminApiService.getClasses();
    const classData = classes.find(cls => cls.class_id == id);
    
    if (classData) {
      openClassModal(classData);
    } else {
      showErrorMessage('Class not found. Please refresh and try again.');
    }
  } catch (error) {
    console.error('Error editing class:', error);
    showErrorMessage('Failed to load class data. Please try again.');
  }
}

/**
 * Add a new class at a specific time slot
 */
function addNewClass(timeSlot) {
  // Parse time from timeSlot string (format: "7:00 AM")
  const [time, ampm] = timeSlot.trim().split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour24 = hours;
  
  // Convert to 24-hour format
  if (ampm.toUpperCase() === 'PM' && hours < 12) {
    hour24 += 12;
  } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  // Format time as HH:MM
  const formattedTime = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  // Open modal for new class
  const modal = document.getElementById('class-modal');
  const form = document.getElementById('class-form');
  
  if (modal && form) {
    openClassModal();
    
    // Set the time
    const timeInput = document.getElementById('class-time');
    if (timeInput) {
      timeInput.value = formattedTime;
    }
  }
}

/**
 * Delete a class
 */
function deleteClass(id) {
  if (confirm('Are you sure you want to remove this class from the schedule? This action cannot be undone.')) {
    try {
      AdminApiService.authRequest(ADMIN_API_ENDPOINTS.classById(id), 'DELETE')
        .then(() => {
          showSuccessMessage('Class removed successfully');
          // Reload schedule
          loadScheduleBuilder();
        })
        .catch(error => {
          console.error('Error deleting class:', error);
          showErrorMessage('Failed to delete class. Please try again.');
        });
    } catch (error) {
      console.error('Error deleting class:', error);
      showErrorMessage('Failed to delete class. Please try again.');
    }
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
 * Use a class template (placeholder function for now)
 */
function useTemplate(id) {
  console.log(`Use template with ID: ${id}`);
  alert(`Use template (ID: ${id}) - This functionality will be implemented soon.`);
}

/**
 * Edit a class template (placeholder function for now)
 */
function editTemplate(id) {
  console.log(`Edit template with ID: ${id}`);
  alert(`Edit template (ID: ${id}) - This functionality will be implemented soon.`);
}

/**
 * Delete a class template (placeholder function for now)
 */
function deleteTemplate(id) {
  console.log(`Delete template with ID: ${id}`);
  if (confirm(`Are you sure you want to delete this class template? This action cannot be undone.`)) {
    alert(`Delete template (ID: ${id}) - This functionality will be implemented soon.`);
  }
}
