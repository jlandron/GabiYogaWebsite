/**
 * Admin Sidebar Template
 * This file contains the HTML template for the admin sidebar as a JavaScript string.
 */

// The HTML template for the admin sidebar
const ADMIN_SIDEBAR_HTML = `
<div class="admin-profile">
    <div class="admin-avatar">
        <i class="fas fa-user"></i>
    </div>
    <div class="admin-name">Gabi</div>
</div>

<ul class="admin-nav">
    <li class="admin-nav-item">
        <a href="admin-dashboard.html" class="admin-nav-link" data-page="dashboard">
            <i class="fas fa-tachometer-alt"></i> Dashboard
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-schedule.html" class="admin-nav-link" data-page="schedule">
            <i class="fas fa-calendar-alt"></i> Schedule
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-sessions.html" class="admin-nav-link" data-page="sessions">
            <i class="fas fa-user-clock"></i> Private Sessions
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-photos.html" class="admin-nav-link" data-page="photos">
            <i class="fas fa-images"></i> Photo Gallery
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-members.html" class="admin-nav-link" data-page="members">
            <i class="fas fa-users"></i> Members
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-customer-dashboard.html" class="admin-nav-link" data-page="customer-dashboard">
            <i class="fas fa-user-circle"></i> Customer Dashboard
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-workshops.html" class="admin-nav-link" data-page="workshops">
            <i class="fas fa-chalkboard-teacher"></i> Workshops
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-retreats.html" class="admin-nav-link" data-page="retreats">
            <i class="fas fa-mountain"></i> Retreats
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-blog.html" class="admin-nav-link" data-page="blog">
            <i class="fas fa-blog"></i> Blog Posts
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-pricing.html" class="admin-nav-link" data-page="pricing">
            <i class="fas fa-tags"></i> Pricing & Offerings
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="https://gabi-yoga-mail-org.awsapps.com/mail" class="admin-nav-link" data-page="mail" target="_blank">
            <i class="fas fa-envelope"></i> Mail
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-communications.html" class="admin-nav-link" data-page="communications">
            <i class="fas fa-envelope"></i> Communications
        </a>
    </li>
    <li class="admin-nav-item">
        <a href="admin-settings.html" class="admin-nav-link" data-page="settings">
            <i class="fas fa-cog"></i> Settings
        </a>
    </li>
</ul>

<!-- Return to Website button -->
<a href="index.html" class="btn admin-return-website">
    <i class="fas fa-home"></i> Return to Website
</a>

<button id="admin-logout-btn" class="btn admin-logout">
    <i class="fas fa-sign-out-alt"></i> Sign Out
</button>
`;
