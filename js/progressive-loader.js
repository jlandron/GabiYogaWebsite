/**
 * Progressive Page Loader
 * 
 * Manages the progressive loading of page sections to improve user experience
 * Priority: Header and Hero first, then other sections in order of importance
 */

class ProgressiveLoader {
    constructor() {
        this.loadedSections = new Set();
        this.loadingQueue = [];
        this.isHeaderLoaded = false;
        this.isHeroLoaded = false;
        
        // Initialize progressive loading
        this.init();
    }
    
    async init() {
        console.log('[Progressive Loader] Starting progressive page load...');
        
        // Phase 1: Load critical content first (Header + Hero)
        await this.loadCriticalContent();
        
        // Phase 2: Load primary content with small delays
        await this.loadPrimaryContent();
        
        // Phase 3: Load secondary content
        await this.loadSecondaryContent();
        
        console.log('[Progressive Loader] All content loaded successfully');
    }
    
    async loadCriticalContent() {
        console.log('[Progressive Loader] Phase 1: Loading critical content (Header + Hero)');
        
        // Load header and hero simultaneously
        const criticalPromises = [
            this.loadHeader(),
            this.loadHero()
        ];
        
        await Promise.all(criticalPromises);
        console.log('[Progressive Loader] Critical content loaded');
    }
    
    async loadPrimaryContent() {
        console.log('[Progressive Loader] Phase 2: Loading primary content');
        
        // Load primary sections with small delays for smooth experience
        const primarySections = [
            { name: 'visibility-settings', loader: () => this.loadVisibilitySettings() },
            { name: 'website-settings', loader: () => this.loadWebsiteSettings() },
            { name: 'bio-content', loader: () => this.loadBioContent() },
            { name: 'latest-blog', loader: () => this.loadLatestBlog() }
        ];
        
        for (const section of primarySections) {
            try {
                await section.loader();
                await this.delay(200); // Small delay between sections
                console.log(`[Progressive Loader] ${section.name} loaded`);
            } catch (error) {
                console.error(`[Progressive Loader] Error loading ${section.name}:`, error);
            }
        }
    }
    
    async loadSecondaryContent() {
        console.log('[Progressive Loader] Phase 3: Loading secondary content');
        
        // Load remaining sections with slightly longer delays
        const secondarySections = [
            { name: 'offerings', loader: () => this.loadOfferings() },
            { name: 'gallery', loader: () => this.loadGallery() },
            { name: 'schedule', loader: () => this.loadSchedule() },
            { name: 'pricing', loader: () => this.loadPricing() },
            { name: 'private-sessions', loader: () => this.loadPrivateSessions() },
            { name: 'retreats', loader: () => this.loadRetreats() },
            { name: 'user-data', loader: () => this.loadUserData() }
        ];
        
        for (const section of secondarySections) {
            try {
                await section.loader();
                await this.delay(300); // Slightly longer delay for secondary content
                console.log(`[Progressive Loader] ${section.name} loaded`);
            } catch (error) {
                console.error(`[Progressive Loader] Error loading ${section.name}:`, error);
            }
        }
    }
    
    async loadHeader() {
        return new Promise((resolve) => {
            // Check if header loader exists and run it
            if (typeof window.headerLoader === 'function') {
                window.headerLoader().then(() => {
                    this.isHeaderLoaded = true;
                    resolve();
                });
            } else {
                // Fallback to direct header loading
                this.loadHeaderDirect().then(() => {
                    this.isHeaderLoaded = true;
                    resolve();
                });
            }
        });
    }
    
    async loadHeaderDirect() {
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (!headerPlaceholder) return;
        
        try {
            const response = await fetch('/components/header.html');
            if (!response.ok) throw new Error('Failed to fetch header');
            
            const html = await response.text();
            headerPlaceholder.innerHTML = html;
            
            // Initialize mobile menu
            this.initMobileMenu();
            this.highlightCurrentPage();
            
        } catch (error) {
            console.error('Error loading header:', error);
            headerPlaceholder.innerHTML = `<header><nav class="navbar"><div class="logo"><h1>Gabi Yoga</h1></div></nav></header>`;
        }
    }
    
    async loadHero() {
        return new Promise((resolve) => {
            // Check if hero loader exists and run it
            if (typeof window.heroLoader === 'function') {
                window.heroLoader().then(() => {
                    this.isHeroLoaded = true;
                    resolve();
                });
            } else {
                // Load hero content directly
                this.loadHeroDirect().then(() => {
                    this.isHeroLoaded = true;
                    resolve();
                });
            }
        });
    }
    
    async loadHeroDirect() {
        const heroContent = document.querySelector('.hero-content');
        const heroSection = document.querySelector('.hero');
        
        if (!heroContent || !heroSection) return;
        
        // Create hero elements
        const heroHeading = document.createElement('h1');
        const heroSubheading = document.createElement('p');
        const heroButton = document.createElement('a');
        
        heroButton.href = '#offerings';
        heroButton.className = 'btn';
        heroButton.textContent = 'Explore Classes';
        
        heroContent.appendChild(heroHeading);
        heroContent.appendChild(heroSubheading);
        heroContent.appendChild(heroButton);
        
        // Set initial animation state
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(25px)';
        heroContent.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        
        try {
            // Load hero settings
            const response = await fetch('/api/website-settings');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.settings && data.settings.heroText) {
                    this.applyHeroSettings(heroHeading, heroSubheading, data.settings.heroText);
                } else {
                    this.applyDefaultHeroContent(heroHeading, heroSubheading);
                }
            } else {
                this.applyDefaultHeroContent(heroHeading, heroSubheading);
            }
        } catch (error) {
            console.error('Error loading hero settings:', error);
            this.applyDefaultHeroContent(heroHeading, heroSubheading);
        }
        
        // Trigger animation
        setTimeout(() => {
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 300);
        
        // Load hero background image
        this.loadHeroBackground(heroSection);
    }
    
    applyHeroSettings(heading, subheading, settings) {
        if (settings.heading && settings.heading.text) {
            // Clean the text and extract just the content
            let headingText = settings.heading.text;
            if (headingText.includes('<') && headingText.includes('>')) {
                // Extract text from HTML tags
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = headingText;
                headingText = tempDiv.textContent || tempDiv.innerText || 'Find Your Inner Peace';
            }
            heading.textContent = headingText;
            
            if (settings.heading.font) {
                heading.style.fontFamily = settings.heading.font;
            }
            if (settings.heading.size) {
                heading.style.fontSize = settings.heading.size;
            }
        } else {
            heading.textContent = 'Find Your Inner Peace';
        }
        
        if (settings.subheading && settings.subheading.text) {
            // Clean the text and extract just the content
            let subheadingText = settings.subheading.text;
            if (subheadingText.includes('<') && subheadingText.includes('>')) {
                // Extract text from HTML tags
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = subheadingText;
                subheadingText = tempDiv.textContent || tempDiv.innerText || 'Join our community and transform your mind, body, and spirit';
            }
            subheading.textContent = subheadingText;
            
            if (settings.subheading.font) {
                subheading.style.fontFamily = settings.subheading.font;
            }
            if (settings.subheading.size) {
                subheading.style.fontSize = settings.subheading.size;
            }
        } else {
            subheading.textContent = 'Join our community and transform your mind, body, and spirit';
        }
    }
    
    applyDefaultHeroContent(heading, subheading) {
        heading.textContent = 'Find Your Inner Peace';
        subheading.textContent = 'Join our community and transform your mind, body, and spirit';
    }
    
    loadHeroBackground(heroSection) {
        const heroImageFile = 'photo-1615729947596-a598e5de0ab3.jpeg';
        heroSection.style.transition = "background 1s ease-in";
        
        const img = new Image();
        img.onload = () => {
            setTimeout(() => {
                heroSection.style.background = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('/images/${heroImageFile}')`;
                heroSection.style.backgroundSize = 'cover';
                heroSection.style.backgroundPosition = 'center';
                heroSection.classList.add('image-loaded');
            }, 100);
        };
        img.src = `/images/${heroImageFile}`;
    }
    
    async loadVisibilitySettings() {
        // Show loading state for sections that depend on visibility settings
        this.showSectionLoading(['gallery', 'schedule', 'membership', 'private-sessions', 'retreats']);
        
        try {
            const response = await fetch('/api/settings');
            if (!response.ok) throw new Error('Failed to fetch settings');
            
            const data = await response.json();
            if (data.success && data.settings && data.settings.sectionToggles) {
                this.applyVisibilitySettings(data.settings.sectionToggles);
            }
        } catch (error) {
            console.error('Error loading visibility settings:', error);
        }
    }
    
    async loadWebsiteSettings() {
        try {
            const response = await fetch('/api/website-settings');
            if (!response.ok) throw new Error('Failed to fetch website settings');
            
            const data = await response.json();
            if (data.success) {
                this.applyWebsiteSettings(data.settings);
            }
        } catch (error) {
            console.error('Error loading website settings:', error);
        }
    }
    
    async loadBioContent() {
        // Run bio content loader if available
        if (window.bioContentLoader && typeof window.bioContentLoader.loadBioContent === 'function') {
            await window.bioContentLoader.loadBioContent();
        }
    }
    
    async loadLatestBlog() {
        // Run latest blog loader if available
        if (window.latestBlogLoader && typeof window.latestBlogLoader.loadLatestBlog === 'function') {
            await window.latestBlogLoader.loadLatestBlog();
        }
    }
    
    async loadOfferings() {
        this.showSectionLoading(['offerings']);
        
        // Run offerings content loader if available
        if (window.offeringsLoader && typeof window.offeringsLoader.loadOfferings === 'function') {
            await window.offeringsLoader.loadOfferings();
        }
        
        this.hideSectionLoading(['offerings']);
    }
    
    async loadGallery() {
        this.showSectionLoading(['gallery']);
        
        // Run gallery loader if available
        if (window.galleryLoader && typeof window.galleryLoader.initializeGallery === 'function') {
            await window.galleryLoader.initializeGallery();
        }
        
        this.hideSectionLoading(['gallery']);
    }
    
    async loadSchedule() {
        try {
            const response = await fetch('/api/schedule');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderSchedule(data.schedule);
                }
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    }
    
    async loadPricing() {
        this.showSectionLoading(['membership', 'private-sessions']);
        
        // Run pricing display if available
        if (window.pricingDisplay && typeof window.pricingDisplay.loadPricing === 'function') {
            await window.pricingDisplay.loadPricing();
        }
        
        this.hideSectionLoading(['membership', 'private-sessions']);
    }
    
    async loadPrivateSessions() {
        // Load session packages for modal
        try {
            const response = await fetch('/api/pricing');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.pricing && data.pricing.sessionPackages) {
                    this.populateSessionPackages(data.pricing.sessionPackages);
                }
            }
        } catch (error) {
            console.error('Error loading private sessions:', error);
        }
    }
    
    async loadRetreats() {
        try {
            const response = await fetch('/api/retreats/featured');
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.retreats)) {
                    this.renderRetreats(data.retreats);
                }
            }
        } catch (error) {
            console.error('Error loading retreats:', error);
        }
    }
    
    async loadUserData() {
        // Initialize user data manager if available
        if (window.userDataManager && typeof window.userDataManager.init === 'function') {
            await window.userDataManager.init();
        }
    }
    
    // Helper methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    showSectionLoading(sectionIds) {
        sectionIds.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                const existing = section.querySelector('.progressive-loading');
                if (!existing) {
                    const loader = document.createElement('div');
                    loader.className = 'progressive-loading';
                    loader.innerHTML = '<div class="spinner"></div><p>Loading...</p>';
                    loader.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 2rem;
                        opacity: 0.7;
                    `;
                    section.appendChild(loader);
                }
            }
        });
    }
    
    hideSectionLoading(sectionIds) {
        sectionIds.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                const loader = section.querySelector('.progressive-loading');
                if (loader) {
                    loader.remove();
                }
            }
        });
    }
    
    // Navigation helpers
    initMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
            
            document.querySelectorAll('.nav-links a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });
        }
    }
    
    highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-links a');
        const logoLink = document.querySelector('.logo a');
        
        if (logoLink && (currentPage === 'index.html' || currentPage === '')) {
            logoLink.classList.add('active');
        }
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href').split('#')[0];
            if (href === currentPage) {
                link.classList.add('active');
            }
        });
    }
    
    // Content application methods (simplified versions of existing functions)
    applyVisibilitySettings(sectionToggles) {
        Object.keys(sectionToggles).forEach(key => {
            const isVisible = sectionToggles[key];
            const sectionMapping = {
                'gallerySection': 'gallery',
                'scheduleSection': 'schedule', 
                'membershipSection': 'membership',
                'privateSessionsSection': 'private-sessions',
                'retreatsSection': 'retreats'
            };
            
            const sectionId = sectionMapping[key];
            if (sectionId) {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = isVisible ? 'block' : 'none';
                }
            }
        });
    }
    
    applyWebsiteSettings(settings) {
        // Apply contact info, social links, etc.
        if (settings.contactInfo) {
            const addressElem = document.querySelector('.contact-info p:nth-child(2)');
            const phoneElem = document.querySelector('.contact-info p:nth-child(3)');
            const emailElem = document.querySelector('.contact-info p:nth-child(4)');
            
            if (addressElem && settings.contactInfo.address) {
                addressElem.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${settings.contactInfo.address}`;
            }
            
            if (phoneElem && settings.contactInfo.phone) {
                phoneElem.innerHTML = `<i class="fas fa-phone"></i> ${settings.contactInfo.phone}`;
            }
            
            if (emailElem && settings.contactInfo.email) {
                emailElem.innerHTML = `<i class="fas fa-envelope"></i> ${settings.contactInfo.email}`;
            }
        }
    }
    
    renderSchedule(scheduleData) {
        const scheduleTable = document.querySelector('.schedule-table tbody');
        
        if (!scheduleTable || !scheduleData || !scheduleData.length) {
            // If no schedule data, show message
            if (scheduleTable) {
                scheduleTable.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align:center;padding:20px;">
                            No classes currently scheduled. Please check back later.
                        </td>
                    </tr>
                `;
            }
            return;
        }
        
        // Clear loading message
        scheduleTable.innerHTML = '';
        
        // Time slots (rows)
        const timeSlots = [
            '7:00 AM', 
            '8:00 AM',
            '9:00 AM', 
            '9:30 AM',
            '10:30 AM', 
            '12:00 PM', 
            '3:30 PM',
            '5:00 PM',
            '5:30 PM',
            '6:00 PM', 
            '7:00 PM',
            '7:30 PM'
        ];
        
        // Create a row for each time slot
        timeSlots.forEach(timeSlot => {
            const row = document.createElement('tr');
            
            // Add time cell
            const timeCell = document.createElement('td');
            timeCell.textContent = timeSlot;
            row.appendChild(timeCell);
            
            // Add a cell for each day of the week
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(dayOfWeek => {
                const cell = document.createElement('td');
                
                // Find class for this day and time
                const classData = scheduleData.find(c => 
                    c.day === dayOfWeek && 
                    c.time === timeSlot
                );
                
                if (classData) {
                    cell.innerHTML = `
                        <strong>${classData.name}</strong><br>
                        <span class="instructor">${classData.instructor}</span>
                    `;
                    
                    // Add classes for styling based on class type
                    if (classData.type) {
                        cell.classList.add(`class-${classData.type.toLowerCase().replace(/\s+/g, '-')}`);
                    }
                } else {
                    cell.innerHTML = '—';
                }
                
                row.appendChild(cell);
            });
            
            scheduleTable.appendChild(row);
        });
        
        console.log('Schedule data rendered');
    }
    
    populateSessionPackages(packages) {
        // Simplified session packages population
        console.log('Session packages populated:', packages.length);
    }
    
    renderRetreats(retreatsData) {
        // Simplified retreats rendering
        console.log('Retreats rendered:', retreatsData.length);
    }
}

// Initialize progressive loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.progressiveLoader = new ProgressiveLoader();
});
