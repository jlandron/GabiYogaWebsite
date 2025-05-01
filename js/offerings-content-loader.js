/**
 * Offerings Content Loader
 * 
 * Updates the homepage Offerings section with content from the database
 * Handles both plain text and HTML content with proper formatting
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the offering cards first
    const offeringCards = document.querySelectorAll('.offering-card');
    
    // Map to store offering sections
    const offeringSections = {
        groupClasses: null,
        privateLessons: null,
        workshops: null,
        retreats: null
    };
    
    // Find or create content areas in each card
    if (offeringCards.length >= 4) {
        // Match the cards to the offerings in order they appear
        const offeringTypes = ['groupClasses', 'privateLessons', 'workshops', 'retreats'];
        
        // Process each card
        offeringCards.forEach((card, index) => {
            if (index < offeringTypes.length) {
                // First look for an existing content area
                let contentElement = card.querySelector('.content-area');
                
                // If no dedicated content area exists, use the paragraph or create a content area
                if (!contentElement) {
                    contentElement = card.querySelector('p');
                    
                    // If no paragraph exists either, create a content area
                    if (!contentElement) {
                        contentElement = document.createElement('div');
                        contentElement.className = 'content-area';
                        
                        // Insert after the heading (if it exists)
                        const heading = card.querySelector('h3, h4');
                        if (heading) {
                            heading.parentNode.insertBefore(contentElement, heading.nextSibling);
                        } else {
                            card.appendChild(contentElement);
                        }
                    }
                }
                
                // Store the content element
                offeringSections[offeringTypes[index]] = contentElement;
            }
        });
    }
    
    // If no offerings found, exit early
    if (!offeringSections.groupClasses && 
        !offeringSections.privateLessons && 
        !offeringSections.workshops && 
        !offeringSections.retreats) {
        return;
    }
    
    try {
        // Fetch the website settings from the API
        const response = await fetch('/api/website-settings');
        
        if (!response.ok) {
            console.warn('[Offerings Debug] Failed to fetch offerings content:', response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('[Offerings Debug] Settings data received:', 
                   data.success ? 'Success' : 'Failed',
                   data.settings?.offeringsContent ? 'Offerings content present' : 'No offerings content');
        
        // If we got valid settings with offerings content, update the elements
        if (data && data.success && data.settings && data.settings.offeringsContent) {
            const offeringsContent = data.settings.offeringsContent;
            
            // Process each offering section
            Object.keys(offeringSections).forEach(key => {
                const element = offeringSections[key];
                const content = offeringsContent[key];
                
                // If both element and content exist
                if (element && content) {
                    // Before updating, remove any existing content but preserve the element itself
                    // This ensures a clean state before applying new content
                    const card = element.closest('.offering-card');
                    if (card) {
                        // Find and remove any existing lists that might duplicate content
                        const existingLists = card.querySelectorAll('ul:not([class]), ol:not([class])');
                        existingLists.forEach(list => {
                            list.remove(); // Remove completely instead of just hiding
                        });
                    }
                    
                    // Clear the element itself to receive new content
                    element.innerHTML = '';
                    
                    // Add the new content
                    if (content.trim().startsWith('<')) {
                        // If it's HTML content
                        element.innerHTML = content;
                    } else {
                        // If it's plain text
                        element.textContent = content;
                    }
                    
                    // Apply formatting from settings if available
                    const formatProperties = {
                        font: offeringsContent[`${key}Font`],
                        size: offeringsContent[`${key}Size`],
                        weight: offeringsContent[`${key}FontWeight`],
                        style: offeringsContent[`${key}FontStyle`],
                        decoration: offeringsContent[`${key}TextDecoration`],
                        align: offeringsContent[`${key}TextAlign`]
                    };
                    
                    if (formatProperties.font || formatProperties.size || 
                        formatProperties.weight || formatProperties.style || 
                        formatProperties.decoration || formatProperties.align) {
                        
                        console.log(`[Offerings Debug] Applying formatting to ${key}:`, formatProperties);
                        
                        // Font handling requires special attention - log more details
                        if (formatProperties.font) {
                            console.log(`[Offerings Debug] [${key}] Font before processing:`, formatProperties.font);
                            
                            // Extract actual font name from CSS font-family value
                            // Handle both 'Font Name', serif and "Font Name", serif formats
                            const fontMatch = formatProperties.font.match(/'([^']+)'|"([^"]+)"|([^,\s]+)/);
                            if (fontMatch) {
                                const fontName = fontMatch[1] || fontMatch[2] || fontMatch[3];
                                console.log(`[Offerings Debug] [${key}] Extracted font name:`, fontName);
                                
                                // Apply the font directly to the element
                                element.style.fontFamily = formatProperties.font;
                                console.log(`[Offerings Debug] [${key}] Applied font family:`, formatProperties.font);
                            } else {
                                // Fallback if unable to extract font name
                                element.style.fontFamily = formatProperties.font;
                                console.log(`[Offerings Debug] [${key}] Applied raw font value:`, formatProperties.font);
                            }
                        }
                        
                        // Apply remaining styles directly to the element
                        if (formatProperties.size) {
                            element.style.fontSize = formatProperties.size;
                            console.log(`[Offerings Debug] [${key}] Applied font size:`, formatProperties.size);
                        }
                        if (formatProperties.weight) {
                            element.style.fontWeight = formatProperties.weight;
                            console.log(`[Offerings Debug] [${key}] Applied font weight:`, formatProperties.weight);
                        }
                        if (formatProperties.style) {
                            element.style.fontStyle = formatProperties.style;
                            console.log(`[Offerings Debug] [${key}] Applied font style:`, formatProperties.style);
                        }
                        if (formatProperties.decoration) {
                            element.style.textDecoration = formatProperties.decoration;
                            console.log(`[Offerings Debug] [${key}] Applied text decoration:`, formatProperties.decoration);
                        }
                        if (formatProperties.align) {
                            element.style.textAlign = formatProperties.align;
                            console.log(`[Offerings Debug] [${key}] Applied text alignment:`, formatProperties.align);
                        }
                    }
                }
            });
            
            // Log detailed results of the updates
            Object.keys(offeringSections).forEach(key => {
                if (offeringSections[key]) {
                    const element = offeringSections[key];
                    console.log(`[Offerings Debug] Final ${key} content state:`, {
                        content: element.innerHTML.substring(0, 50) + (element.innerHTML.length > 50 ? '...' : ''),
                        fontFamily: element.style.fontFamily,
                        fontSize: element.style.fontSize,
                        fontWeight: element.style.fontWeight,
                        fontStyle: element.style.fontStyle,
                        textDecoration: element.style.textDecoration,
                        textAlign: element.style.textAlign
                    });
                }
            });
            
            console.log('[Offerings Debug] Offerings content updated successfully');
            
            // Check for section toggles and hide/show sections
            if (data.settings.sectionToggles) {
                const toggles = data.settings.sectionToggles;
                
                console.log('[Offerings Debug] Applying section visibility toggles:', toggles);
                
                // Toggle individual offerings
                if (toggles.groupClasses === false) {
                    const card = offeringSections.groupClasses?.closest('.offering-card');
                    if (card) {
                        card.style.display = 'none';
                        console.log('[Offerings Debug] Hiding group classes card');
                    }
                }
                
                if (toggles.privateLessons === false) {
                    const card = offeringSections.privateLessons?.closest('.offering-card');
                    if (card) {
                        card.style.display = 'none';
                        console.log('[Offerings Debug] Hiding private lessons card');
                    }
                }
                
                if (toggles.workshops === false) {
                    const card = offeringSections.workshops?.closest('.offering-card');
                    if (card) {
                        card.style.display = 'none';
                        console.log('[Offerings Debug] Hiding workshops card');
                    }
                }
                
                if (toggles.retreats === false) {
                    const card = offeringSections.retreats?.closest('.offering-card');
                    if (card) {
                        card.style.display = 'none';
                        console.log('[Offerings Debug] Hiding retreats card');
                    }
                }
                
                // Toggle entire sections
                if (toggles.retreatsSection === false) {
                    const section = document.getElementById('retreats');
                    if (section) {
                        section.style.display = 'none';
                        console.log('[Offerings Debug] Hiding retreats section');
                    }
                }
                
                if (toggles.scheduleSection === false) {
                    const section = document.getElementById('schedule');
                    if (section) {
                        section.style.display = 'none';
                        console.log('[Offerings Debug] Hiding schedule section');
                    }
                }
                
                if (toggles.membershipSection === false) {
                    const section = document.getElementById('membership');
                    if (section) section.style.display = 'none';
                }
                
                if (toggles.privateSessionsSection === false) {
                    const section = document.getElementById('private-sessions');
                    if (section) section.style.display = 'none';
                }
                
                if (toggles.gallerySection === false) {
                    const section = document.getElementById('gallery');
                    if (section) section.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading offerings content:', error);
    }
});
