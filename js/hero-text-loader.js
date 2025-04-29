/**
 * Hero Text Loader
 * 
 * Updates the homepage hero section with the text, fonts, and sizes from admin settings
 * Adds fade-in animation for hero text and button on page load
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the hero text elements
    const heroHeading = document.querySelector('.hero-content h1');
    const heroSubheading = document.querySelector('.hero-content p');
    const heroButton = document.querySelector('.hero-content .btn');
    const heroContent = document.querySelector('.hero-content');
    
    // Set initial state for fade-in animation
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(25px)';
        heroContent.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
    }
    
    if (heroHeading) {
        heroHeading.style.opacity = '0';
        heroHeading.style.transition = 'opacity 1.2s ease';
    }
    
    if (heroSubheading) {
        heroSubheading.style.opacity = '0';
        heroSubheading.style.transition = 'opacity 1.2s ease 0.3s'; // Delay subheading animation
    }
    
    if (heroButton) {
        heroButton.style.opacity = '0';
        heroButton.style.transform = 'translateY(20px)';
        heroButton.style.transition = 'opacity 1.2s ease 0.8s, transform 1.2s ease 0.8s'; // Further delay button animation
    }
    
    if (!heroHeading || !heroSubheading) return;
    
    try {
        // Fetch the website settings from the API
        const response = await fetch('/api/website-settings');
        
        if (!response.ok) {
            console.warn('Failed to fetch website settings:', response.statusText);
            return;
        }
        
        const data = await response.json();
        
        // If we got valid settings with hero text data, update the elements
        if (data && data.success && data.settings && data.settings.heroText) {
            const { heading, subheading } = data.settings.heroText;
            
            // Update heading
            if (heading) {
                if (heading.text) heroHeading.textContent = heading.text || 'Find Your Inner Peace';
                if (heading.font) heroHeading.style.fontFamily = heading.font;
                if (heading.size) heroHeading.style.fontSize = heading.size;
                // Add text formatting styles
                if (heading.fontWeight) heroHeading.style.fontWeight = heading.fontWeight;
                if (heading.fontStyle) heroHeading.style.fontStyle = heading.fontStyle;
                if (heading.textDecoration) heroHeading.style.textDecoration = heading.textDecoration;
                // Ensure the text alignment is set to center
                heroHeading.style.textAlign = heading.textAlign || 'center';
            } else {
                // Default text and styles if no settings are available
                heroHeading.textContent = 'Find Your Inner Peace';
                heroHeading.style.fontWeight = 'normal';
                heroHeading.style.fontStyle = 'normal';
                heroHeading.style.textDecoration = 'none';
            }
            
            // Update subheading
            if (subheading) {
                if (subheading.text) heroSubheading.textContent = subheading.text || 'Join our community and transform your mind, body, and spirit';
                if (subheading.font) heroSubheading.style.fontFamily = subheading.font;
                if (subheading.size) heroSubheading.style.fontSize = subheading.size;
                // Add text formatting styles
                if (subheading.fontWeight) heroSubheading.style.fontWeight = subheading.fontWeight;
                if (subheading.fontStyle) heroSubheading.style.fontStyle = subheading.fontStyle;
                if (subheading.textDecoration) heroSubheading.style.textDecoration = subheading.textDecoration;
                // Ensure the text alignment is set to center
                heroSubheading.style.textAlign = subheading.textAlign || 'center';
            } else {
                // Default text and styles if no settings are available
                heroSubheading.textContent = 'Join our community and transform your mind, body, and spirit';
                heroSubheading.style.fontWeight = 'normal';
                heroSubheading.style.fontStyle = 'normal';
                heroSubheading.style.textDecoration = 'none';
            }
            
            // Update the button text if it exists
            if (heroButton && heroButton.textContent === '') {
                heroButton.textContent = 'Explore Classes';
            }
            
            console.log('Hero text updated successfully');
        }
        
        // Trigger fade-in animation after content is loaded and processed
        setTimeout(() => {
            if (heroContent) {
                heroContent.style.opacity = '1';
                heroContent.style.transform = 'translateY(0)';
            }
            
            if (heroHeading) {
                heroHeading.style.opacity = '1';
            }
            
            if (heroSubheading) {
                heroSubheading.style.opacity = '1';
            }
            
            if (heroButton) {
                heroButton.style.opacity = '1';
                heroButton.style.transform = 'translateY(0)';
            }
        }, 500); // Increased delay to ensure a more noticeable fade-in effect
        
    } catch (error) {
        console.error('Error loading hero text:', error);
    }
});
