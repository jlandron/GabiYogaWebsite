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
                // Add text formatting styles
                if (heading.fontWeight) heroHeading.style.fontWeight = heading.fontWeight;
                if (heading.fontStyle) heroHeading.style.fontStyle = heading.fontStyle;
                if (heading.textDecoration) heroHeading.style.textDecoration = heading.textDecoration;
                // Ensure the text alignment is set to center
                heroHeading.style.textAlign = heading.textAlign || 'center';
            } else {
                // Default to normal weight if no settings are available
                heroHeading.style.fontWeight = 'normal';
                heroHeading.style.fontStyle = 'normal';
                heroHeading.style.textDecoration = 'none';
            }
            
            // Update subheading
            if (subheading) {
                if (subheading.text) heroSubheading.textContent = subheading.text;
                if (subheading.font) heroSubheading.style.fontFamily = subheading.font;
                if (subheading.size) heroSubheading.style.fontSize = subheading.size;
                // Add text formatting styles
                if (subheading.fontWeight) heroSubheading.style.fontWeight = subheading.fontWeight;
                if (subheading.fontStyle) heroSubheading.style.fontStyle = subheading.fontStyle;
                if (subheading.textDecoration) heroSubheading.style.textDecoration = subheading.textDecoration;
                // Ensure the text alignment is set to center
                heroSubheading.style.textAlign = subheading.textAlign || 'center';
            } else {
                // Default to normal weight if no settings are available
                heroSubheading.style.fontWeight = 'normal';
                heroSubheading.style.fontStyle = 'normal';
                heroSubheading.style.textDecoration = 'none';
            }
            
            console.log('Hero text updated successfully');
        }
    } catch (error) {
        console.error('Error loading hero text:', error);
    }
});
