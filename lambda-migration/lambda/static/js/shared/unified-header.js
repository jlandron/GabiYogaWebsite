// Unified Header Component
class UnifiedHeader {
    constructor(options = {}) {
        this.currentPage = options.currentPage || 'home';
        this.showAuthButtons = options.showAuthButtons !== false;
        this.customActions = options.customActions || [];
    }

    render() {
        return `
            <header class="header">
                <nav class="nav-container">
                    <a href="/" class="logo">Gabi Yoga</a>
                    <div class="nav-content">
                        <ul class="nav-links">
                            <li><a href="/" ${this.currentPage === 'home' ? 'class="active"' : ''}>Home</a></li>
                            <li><a href="/blog-page" ${this.currentPage === 'blog' ? 'class="active"' : ''}>Blog</a></li>
                            ${this.currentPage === 'admin' ? '<li><a href="/admin.html" class="active">Admin</a></li>' : ''}
                            ${this.currentPage === 'user' ? '<li><a href="/user-dashboard.html" class="active">Dashboard</a></li>' : ''}
                        </ul>
                        <div class="auth-buttons">
                            ${this.renderAuthButtons()}
                            ${this.renderCustomActions()}
                        </div>
                    </div>
                </nav>
            </header>
        `;
    }

    renderAuthButtons() {
        if (!this.showAuthButtons) return '';
        
        const token = localStorage.getItem('token');
        if (token) {
            return `
                <a href="/user-dashboard.html" class="btn btn-outline">Dashboard</a>
                <button id="header-logout-btn" class="btn btn-outline">Logout</button>
            `;
        } else {
            return `<button class="btn btn-outline" onclick="showLoginForm()">Login</button>`;
        }
    }

    renderCustomActions() {
        return this.customActions.map(action => 
            `<button class="btn ${action.class || 'btn-outline'}" onclick="${action.onclick}">${action.text}</button>`
        ).join('');
    }

    mount(selector) {
        const container = document.querySelector(selector);
        if (container) {
            container.innerHTML = this.render();
            this.attachEventListeners();
        }
    }

    attachEventListeners() {
        const logoutBtn = document.getElementById('header-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout);
        }
    }

    handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

// Export for use in other files
window.UnifiedHeader = UnifiedHeader;