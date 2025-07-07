/**
 * Profile Loader
 * 
 * Updates the homepage About Me section with the profile photo from the gallery
 * Works with both database storage and file-based storage
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get profile image elements from both homepage and blog page
    const profileImages = document.querySelectorAll('#about .about-image img, .about-widget .about-image');
    if (profileImages.length === 0) return;
    
    try {
        // Fetch the profile photo URL from the API
        const response = await fetch('/api/gallery/profile-photo-url');
        
        if (!response.ok) {
            console.warn('Failed to fetch profile photo URL:', response.statusText);
            return;
        }
        
        const data = await response.json();
        
        // If we got a valid URL, update all profile images
        if (data && data.url) {
            profileImages.forEach(profileImage => {
                profileImage.src = data.url;
                
                // Important: Remove lazy-loading attributes to prevent multi-region loader interference
                profileImage.removeAttribute('data-src');
                profileImage.classList.remove('lazy-load');
                profileImage.classList.add('loaded');
            });
            
            console.log('Profile photo updated successfully');
            console.log(`Profile photo updated in ${profileImages.length} location(s)`);
        }
    } catch (error) {
        console.error('Error loading profile photo:', error);
    }
});
