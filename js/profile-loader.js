/**
 * Profile Loader
 * 
 * Updates the homepage About Me section with the profile photo from the gallery
 * Works with both database storage and file-based storage
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the profile image element
    const profileImage = document.querySelector('#about .about-image img');
    if (!profileImage) return;
    
    try {
        // Fetch the profile photo URL from the API
        const response = await fetch('/api/gallery/profile-photo-url');
        
        if (!response.ok) {
            console.warn('Failed to fetch profile photo URL:', response.statusText);
            return;
        }
        
        const data = await response.json();
        
        // If we got a valid URL, update the image
        if (data && data.url) {
            profileImage.src = data.url;
            console.log('Profile photo updated successfully');
        }
    } catch (error) {
        console.error('Error loading profile photo:', error);
    }
});
