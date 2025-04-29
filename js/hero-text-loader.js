/**
 * Hero Text Loader
 * 
 * Updates the homepage hero section with the text, fonts, and sizes from admin settings
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the hero text elements
    const heroHeading = document.querySelector('.hero-content h1');
    const heroSubheading = document.querySelector('.hero-content p');
    
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
                if (heading.text) heroHeading.textContent = heading.text;
                if (heading.font) heroHeading.style.fontFamily = heading.font;
                if (heading.size) heroHeading.style.fontSize = heading.size;
            }
            
            // Update subheading
            if (subheading) {
                if (subheading.text) heroSubheading.textContent = subheading.text;
                if (subheading.font) heroSubheading.style.fontFamily = subheading.font;
                if (subheading.size) heroSubheading.style.fontSize = subheading.size;
            }
            
            console.log('Hero text updated successfully');
        }
    } catch (error) {
        console.error('Error loading hero text:', error);
    }
});
