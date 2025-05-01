/**
 * Offerings Content Loader
 * 
 * Updates the homepage Offerings section with content from the database
 * Handles both plain text and HTML content with proper formatting
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Get the offerings grid container
    const offeringsGrid = document.querySelector('.offerings-grid');
    
    if (!offeringsGrid) return;
    
    // Define the structure for each card type
    const offeringTypes = [
        {
            key: 'groupClasses',
            title: 'Group Classes',
            icon: 'fa-om',
            defaultContent: 'Join our community for energizing and rejuvenating yoga sessions in a supportive group setting.',
            defaultList: ['Vinyasa Flow', 'Gentle Hatha', 'Power Yoga', 'Restorative', 'Yoga for Beginners'],
            buttonText: 'View Schedule',
            buttonLink: '#schedule'
        },
        {
            key: 'privateLessons',
            title: 'Private Lessons',
            icon: 'fa-yin-yang',
            defaultContent: 'Personalized one-on-one sessions tailored to your specific needs and goals.',
            defaultList: ['Customized practice', 'Focused attention', 'Flexible scheduling', 'In-studio or virtual'],
            buttonText: 'Book a Session',
            buttonLink: '#',
            buttonId: 'private-session-btn'
        },
        {
            key: 'workshops',
            title: 'Workshops',
            icon: 'fa-book-open',
            defaultContent: 'Immersive experiences focusing on specific aspects of yoga practice.',
            defaultList: ['Inversions & Arm Balances', 'Yoga Philosophy', 'Meditation Techniques', 'Breathwork (Pranayama)'],
            buttonText: 'Upcoming Workshops',
            buttonLink: '#events'
        },
        {
            key: 'retreats',
            title: 'Retreats',
            icon: 'fa-mountain',
            defaultContent: 'Transformative multi-day experiences in beautiful locations to deepen your practice.',
            defaultList: ['Weekend local retreats', 'International destinations', 'All-inclusive packages', 'Life-changing experiences'],
            buttonText: 'View Retreats',
            buttonLink: '#retreats'
        }
    ];
    
    // Map to store offering sections
    const offeringSections = {
        groupClasses: null,
        privateLessons: null,
        workshops: null,
        retreats: null
    };
    
    // Create offering cards
    offeringTypes.forEach(type => {
        // Create card and its elements
        const card = document.createElement('div');
        card.className = 'offering-card';
        
        // Create icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'offering-icon';
        const icon = document.createElement('i');
        icon.className = `fas ${type.icon}`;
        iconDiv.appendChild(icon);
        
        // Create heading
        const heading = document.createElement('h3');
        heading.textContent = type.title;
        
        // Create content area for description
        const contentElement = document.createElement('p');
        contentElement.textContent = type.defaultContent;
        
        // Create features list
        const featuresList = document.createElement('ul');
        type.defaultList.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            featuresList.appendChild(listItem);
        });
        
        // Create button
        const button = document.createElement('a');
        button.href = type.buttonLink;
        button.className = 'btn-small';
        button.textContent = type.buttonText;
        
        // Set button ID if provided
        if (type.buttonId) {
            button.id = type.buttonId;
        }
        
        // Append all elements to the card
        card.appendChild(iconDiv);
        card.appendChild(heading);
        card.appendChild(contentElement);
        card.appendChild(featuresList);
        card.appendChild(button);
        
        // Add the card to the grid
        offeringsGrid.appendChild(card);
        
        // Store content element for later updating
        offeringSections[type.key] = contentElement;
    });
    
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
                    
                    // Apply formatting from settings if available, with defaults
                    const formatProperties = {
                        font: offeringsContent[`${key}Font`] || (key === 'groupClasses' ? "'Themunday', serif" : "'Open Sans', sans-serif"),
                        size: offeringsContent[`${key}Size`] || "16px",
                        weight: offeringsContent[`${key}FontWeight`],
                        style: offeringsContent[`${key}FontStyle`],
                        decoration: offeringsContent[`${key}TextDecoration`],
                        align: offeringsContent[`${key}TextAlign`]
                    };
                    
                    console.log(`[Offerings Debug] Offering ${key} format (with defaults):`, formatProperties);
                    
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
