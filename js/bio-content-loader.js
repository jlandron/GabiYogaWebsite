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
            console.warn('[Bio Debug] Failed to fetch instructor bio:', response.statusText);
            return;
        }
        
        const data = await response.json();
        
        console.log('[Bio Debug] Bio data received:', 
                   data.success ? 'Success' : 'Failed', 
                   data.settings ? 'Settings data present' : 'No settings data');
                   
            // If we got valid settings with instructor bio data, update the elements
        if (data && data.success && data.settings && data.settings.about) {
            // Clone data to avoid accidental modifications
            const about = {...(data.settings.about || {})};
            
            // Log raw data before processing
            console.log('[Bio Debug] Raw bio data from API:', JSON.stringify({
                bioFont: data.settings.about?.bioFont,
                bioSize: data.settings.about?.bioSize,
                bioTextAlign: data.settings.about?.bioTextAlign
            }));
            
            // Set defaults if values are missing
            if (!about.bioFont) {
                about.bioFont = "'Themunday', serif";
                console.log('[Bio Debug] Added default bio font: Themunday');
            }
            
            if (!about.bioSize) {
                about.bioSize = "16px";
                console.log('[Bio Debug] Added default bio size: 16px');
            }
            console.log('[Bio Debug] About section data:', {
                name: about.name,
                subtitle: about.subtitle,
                bioLength: about.bio?.length || 0,
                isHTML: about.bio?.trim().startsWith('<') || false,
                bioFont: about.bioFont,
                bioSize: about.bioSize,
                bioWeight: about.bioFontWeight,
                bioStyle: about.bioFontStyle
            });
            
            // Declare bioElement at this scope to make it accessible for logging later
            let bioElement = null;
            
            // Update instructor name
            if (instructorName && about.name) {
                instructorName.textContent = about.name;
                console.log('[Bio Debug] Applied instructor name:', about.name);
            }
            
            // Update instructor subtitle
            if (instructorSubtitle && about.subtitle) {
                instructorSubtitle.textContent = about.subtitle;
                console.log('[Bio Debug] Applied instructor subtitle:', about.subtitle);
            }
            
            // Update instructor bio with proper HTML handling
            if (instructorBioContainer && about.bio) {
                // Check if we already have a bio-content div and remove it if it exists
                const existingBioContent = instructorBioContainer.querySelector('.bio-content');
                if (existingBioContent) {
                    existingBioContent.remove();
                }
                
                // Create a new bio element
                bioElement = document.createElement('div');
                bioElement.className = 'bio-content';
                
                // Check if content is HTML
                if (about.bio.trim().startsWith('<')) {
                    // If it's HTML content
                    bioElement.innerHTML = about.bio;
                    console.log('[Bio Debug] Applied HTML bio content, length:', about.bio.length);
                    console.log('[Bio Debug] Bio HTML preview:', about.bio.substring(0, 100) + (about.bio.length > 100 ? '...' : ''));
                } else {
                    // If it's plain text, preserve line breaks
                    const paragraphs = about.bio.split('\n').filter(p => p.trim() !== '');
                    console.log('[Bio Debug] Splitting plain text bio into', paragraphs.length, 'paragraphs');
                    
                    paragraphs.forEach((paragraph, index) => {
                        const p = document.createElement('p');
                        p.textContent = paragraph;
                        bioElement.appendChild(p);
                        
                        if (index === 0) {
                            console.log('[Bio Debug] First paragraph preview:', paragraph.substring(0, 50) + (paragraph.length > 50 ? '...' : ''));
                        }
                    });
                }
                
                // Apply formatting from settings if available
                if (about.bioFont || about.bioSize || about.bioFontWeight || about.bioFontStyle || about.bioTextDecoration || about.bioTextAlign) {
                    console.log('[Bio Debug] Applying formatting from settings');
                    
                    // Apply styles directly to the bioElement
                    if (about.bioFont) {
                        bioElement.style.fontFamily = about.bioFont;
                        console.log('[Bio Debug] Applied bio font:', about.bioFont);
                    }
                    if (about.bioSize) {
                        bioElement.style.fontSize = about.bioSize;
                        console.log('[Bio Debug] Applied bio size:', about.bioSize);
                    }
                    if (about.bioFontWeight) {
                        bioElement.style.fontWeight = about.bioFontWeight;
                        console.log('[Bio Debug] Applied bio weight:', about.bioFontWeight);
                    }
                    if (about.bioFontStyle) {
                        bioElement.style.fontStyle = about.bioFontStyle;
                        console.log('[Bio Debug] Applied bio style:', about.bioFontStyle);
                    }
                    if (about.bioTextDecoration) {
                        bioElement.style.textDecoration = about.bioTextDecoration;
                        console.log('[Bio Debug] Applied bio decoration:', about.bioTextDecoration);
                    }
                    if (about.bioTextAlign) {
                        bioElement.style.textAlign = about.bioTextAlign;
                        console.log('[Bio Debug] Applied bio alignment:', about.bioTextAlign);
                    }
                    
                    console.log('[Bio Debug] Applied bio formatting:', {
                        font: about.bioFont,
                        size: about.bioSize,
                        weight: about.bioFontWeight,
                        style: about.bioFontStyle,
                        decoration: about.bioTextDecoration,
                        align: about.bioTextAlign
                    });
                } else {
                    console.log('[Bio Debug] No formatting information found in settings');
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
            
            // Log final state of the bio element if it was created
            if (bioElement) {
                console.log('[Bio Debug] Final bio element state:', {
                    innerHTML: bioElement.innerHTML.substring(0, 100) + (bioElement.innerHTML.length > 100 ? '...' : ''),
                    fontFamily: bioElement.style.fontFamily,
                    fontSize: bioElement.style.fontSize,
                    fontWeight: bioElement.style.fontWeight,
                    fontStyle: bioElement.style.fontStyle,
                    textDecoration: bioElement.style.textDecoration,
                    textAlign: bioElement.style.textAlign
                });
            } else {
                console.log('[Bio Debug] No bio element was created');
            }
            
            console.log('[Bio Debug] Instructor bio and certifications updated successfully');
        }
    } catch (error) {
        console.error('Error loading instructor bio:', error);
    }
});
