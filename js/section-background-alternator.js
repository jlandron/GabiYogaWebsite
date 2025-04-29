/**
 * Section Background Alternator
 * 
 * Alternates section backgrounds between solid color and natural image backgrounds
 * based on the sections that are actually visible.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Wait for visibility settings to be applied first
    setTimeout(alternateSectionBackgrounds, 500);
});

/**
 * Apply alternating backgrounds to visible sections
 */
function alternateSectionBackgrounds() {
    // Get all sections after the hero
    const sections = document.querySelectorAll('section:not(.hero)');
    
    // Filter to only visible sections
    const visibleSections = Array.from(sections).filter(section => {
        const display = window.getComputedStyle(section).display;
        return display !== 'none';
    });
    
    // The background image paths to cycle through
    const backgroundImages = [
        'images/austin-1bVPBM3bDDE-unsplash.jpg',
        'images/joeri-romer-Xne1N4yZuOY-unsplash.jpg',
        'images/leo_visions-ljo7oqm_w0U-unsplash.jpg',
        'images/sara-bach-YXn56G46MSU-unsplash.jpg',
        'images/annie-spratt-V95YrpWFgMk-unsplash.jpg',
        'images/ulrike-r-donohue-8MUFyLGjyak-unsplash.jpg'
    ];
    
    let currentImageIndex = 0;
    let isImageBackground = false; // About section keeps original styling; next section gets image background
    
    // Apply alternating backgrounds to each visible section
    visibleSections.forEach((section, index) => {
        const sectionId = section.id;
        
        // Skip the about section - keep its original styling
        if (sectionId === 'about') {
            isImageBackground = true; // Next section after about should have image background
            return;
        }
        
        // For debugging
        console.log(`Applying ${isImageBackground ? 'image' : 'solid'} background to section: ${sectionId}`);
        
        // Apply the appropriate background style
        if (isImageBackground) {
            // Image background with semi-transparent overlay
            section.style.background = `
                linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), 
                url('${backgroundImages[currentImageIndex]}')
            `;
            section.style.backgroundSize = 'cover';
            section.style.backgroundPosition = 'center';
            section.style.backgroundAttachment = 'fixed';
            
            // Apply text styling for image backgrounds
            applyImageBackgroundStyling(section);
            
            // Increment the image index for the next image background
            currentImageIndex = (currentImageIndex + 1) % backgroundImages.length;
        } else {
            // Solid background
            section.style.background = 'var(--secondary-color)';
            section.style.backgroundImage = 'none';
            section.style.backgroundAttachment = 'initial';
            
            // Apply text styling for solid backgrounds
            applySolidBackgroundStyling(section);
        }
        
        // Toggle for next section
        isImageBackground = !isImageBackground;
    });
}

/**
 * Apply styling for sections with image backgrounds
 */
function applyImageBackgroundStyling(section) {
    // Section header styling
    const sectionHeader = section.querySelector('h2');
    if (sectionHeader) {
        sectionHeader.style.color = '#333333';
        sectionHeader.style.position = 'relative';
    }
    
    // Add decorative underline to headers
    if (sectionHeader && !sectionHeader.classList.contains('with-decorative-underline')) {
        sectionHeader.classList.add('with-decorative-underline');
        
        // Add decorative underline using :after in CSS, but we need to make sure
        // it's properly visible against the image background
        const afterStyle = document.createElement('style');
        afterStyle.textContent = `
            #${section.id} h2.with-decorative-underline:after {
                content: "";
                display: block;
                width: 50px;
                height: 3px;
                background-color: var(--accent-color);
                margin: 0.5rem auto;
            }
        `;
        document.head.appendChild(afterStyle);
    }
    
    // Style text elements for better contrast against image background
    const paragraphs = section.querySelectorAll('p:not(.subtitle)');
    paragraphs.forEach(p => {
        p.style.color = '#333333';
        p.style.fontWeight = '400';
    });
    
    // If there are cards or content boxes within the section
    const contentCards = section.querySelectorAll('.offering-card, .retreat-card, .pricing-card, .latest-post');
    contentCards.forEach(card => {
        card.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
    });
}

/**
 * Apply styling for sections with solid backgrounds
 */
function applySolidBackgroundStyling(section) {
    // Section header styling
    const sectionHeader = section.querySelector('h2');
    if (sectionHeader) {
        sectionHeader.style.color = 'var(--primary-color)';
        
        // Remove decorative underline class if previously added
        sectionHeader.classList.remove('with-decorative-underline');
    }
    
    // Style text elements
    const paragraphs = section.querySelectorAll('p:not(.subtitle)');
    paragraphs.forEach(p => {
        p.style.color = 'var(--text-color)';
        p.style.fontWeight = '400';
    });
    
    // If there are cards or content boxes within the section - lighter shadow
    const contentCards = section.querySelectorAll('.offering-card, .retreat-card, .pricing-card, .latest-post');
    contentCards.forEach(card => {
        card.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
    });
}

// Listen for changes from admin settings
window.addEventListener('sectionsVisibilityChanged', function() {
    // Reapply alternating backgrounds when section visibility changes
    alternateSectionBackgrounds();
});
