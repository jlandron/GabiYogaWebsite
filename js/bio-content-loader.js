/**
 * Biography Content Loader
 * 
 * Updates the homepage About Me section with instructor bio and text content
 * Handles both plain text and HTML content from the database
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the instructor bio elements
    const instructorName = document.querySelector('#about .about-text h3');
    const instructorSubtitle = document.querySelector('#about .about-text .subtitle');
    const instructorBioContainer = document.querySelector('#about .about-text');
    const certificationsList = document.querySelector('#about .certifications ul');
    
    if (!instructorName && !instructorSubtitle && !instructorBioContainer) return;
    
    try {
        // Fetch the website settings from the API
        const response = await fetch('/api/website-settings');
        
        if (!response.ok) {
            console.warn('Failed to fetch instructor bio:', response.statusText);
            return;
        }
        
        const data = await response.json();
        
        // If we got valid settings with instructor bio data, update the elements
        if (data && data.success && data.settings && data.settings.about) {
            const about = data.settings.about;
            
            // Update instructor name
            if (instructorName && about.name) {
                instructorName.textContent = about.name;
            }
            
            // Update instructor subtitle
            if (instructorSubtitle && about.subtitle) {
                instructorSubtitle.textContent = about.subtitle;
            }
            
            // Update instructor bio with proper HTML handling
            if (instructorBioContainer && about.bio) {
                // Check if we already have a bio-content div and remove it if it exists
                const existingBioContent = instructorBioContainer.querySelector('.bio-content');
                if (existingBioContent) {
                    existingBioContent.remove();
                }
                
                // Create a new bio element
                const bioElement = document.createElement('div');
                bioElement.className = 'bio-content';
                
                // Check if content is HTML
                if (about.bio.trim().startsWith('<')) {
                    // If it's HTML content
                    bioElement.innerHTML = about.bio;
                } else {
                    // If it's plain text, preserve line breaks
                    const paragraphs = about.bio.split('\n').filter(p => p.trim() !== '');
                    paragraphs.forEach(paragraph => {
                        const p = document.createElement('p');
                        p.textContent = paragraph;
                        bioElement.appendChild(p);
                    });
                }
                
                // Apply formatting from settings if available
                if (about.bioFont || about.bioSize || about.bioFontWeight || about.bioFontStyle || about.bioTextDecoration || about.bioTextAlign) {
                    // Apply styles directly to the bioElement
                    if (about.bioFont) bioElement.style.fontFamily = about.bioFont;
                    if (about.bioSize) bioElement.style.fontSize = about.bioSize;
                    if (about.bioFontWeight) bioElement.style.fontWeight = about.bioFontWeight;
                    if (about.bioFontStyle) bioElement.style.fontStyle = about.bioFontStyle;
                    if (about.bioTextDecoration) bioElement.style.textDecoration = about.bioTextDecoration;
                    if (about.bioTextAlign) bioElement.style.textAlign = about.bioTextAlign;
                    
                    console.log('Applied bio formatting:', {
                        font: about.bioFont,
                        size: about.bioSize,
                        weight: about.bioFontWeight,
                        style: about.bioFontStyle,
                        decoration: about.bioTextDecoration,
                        align: about.bioTextAlign
                    });
                }
                
                // Insert the bio content right after the subtitle but before certifications
                const certifications = instructorBioContainer.querySelector('.certifications');
                if (instructorSubtitle) {
                    instructorBioContainer.insertBefore(bioElement, certifications);
                } else {
                    // If there's no subtitle for some reason, insert at the beginning of the container, before certifications
                    instructorBioContainer.insertBefore(bioElement, certifications);
                }
            }
            
            // Update certifications list
            if (certificationsList && data.settings.certifications && Array.isArray(data.settings.certifications)) {
                // Clear existing certifications
                certificationsList.innerHTML = '';
                
                // Add each certification as a list item
                data.settings.certifications.forEach(cert => {
                    const listItem = document.createElement('li');
                    listItem.textContent = cert;
                    certificationsList.appendChild(listItem);
                });
            }
            
            console.log('Instructor bio and certifications updated successfully');
        }
    } catch (error) {
        console.error('Error loading instructor bio:', error);
    }
});
