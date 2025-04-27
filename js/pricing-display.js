/**
 * Pricing Display JavaScript for Gabi Jyoti Yoga
 * 
 * This file handles the display of pricing and offerings data on the public-facing
 * pages of the website, including memberships and private session packages.
 */

document.addEventListener('DOMContentLoaded', function() {
    // If on dashboard page
    if (document.getElementById('memberships-panel') || document.getElementById('private-sessions-panel')) {
        fetchPricingData();
    }

    // If on the homepage
    const membershipSection = document.querySelector('.membership');
    if (membershipSection) {
        fetchPricingDataForHomepage();
    }
});

/**
 * Fetch pricing data from the API for the dashboard
 */
function fetchPricingData() {
    fetch('/api/pricing')
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch pricing data');
        }
        return response.text();
    })
    .then(responseText => {
        try {
            console.log('Raw response text:', responseText)
            // Parse the JSON
            const data = JSON.parse(responseText);
            
            if (data.success && data.pricing) {
                // Update memberships display
                updateMembershipsDisplay(data.pricing.memberships);
                
                // Update private sessions display
                updateSessionPackagesDisplay(data.pricing.sessionPackages);
                
                console.log('Pricing data loaded successfully');
            } else {
                throw new Error(data.message || 'Failed to fetch pricing data');
            }
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            console.error('Response text:', responseText);
            throw parseError;
        }
    })
    .catch(error => {
        console.error('Error fetching pricing data:', error);
    });
}

/**
 * Update memberships display with current data from API
 */
function updateMembershipsDisplay(memberships) {
    const membershipsPanel = document.getElementById('memberships-panel');
    if (!membershipsPanel) return;
    
    const membershipList = membershipsPanel.querySelector('.membership-list');
    if (!membershipList) return;
    
    // Get only active memberships
    const activeMemberships = memberships.filter(m => m.status === 'active');
    
    // Container for rendered memberships
    let membershipHTML = '';
    
    // Create HTML for each membership
    activeMemberships.forEach(membership => {
        let statusText = '';
        let durationText = '';
        
        if (membership.duration_days) {
            if (membership.duration_days >= 365) {
                // Annual
                const years = Math.floor(membership.duration_days / 365);
                durationText = `${years} year${years > 1 ? 's' : ''}`;
            } else if (membership.duration_days >= 30) {
                // Monthly
                const months = Math.floor(membership.duration_days / 30);
                durationText = `${months} month${months > 1 ? 's' : ''}`;
            } else {
                // Days
                durationText = `${membership.duration_days} days`;
            }
        }
        
        if (membership.classes) {
            statusText = `<span><i class="fas fa-check-circle"></i> ${membership.classes} Classes</span>`;
        } else {
            statusText = `<span><i class="fas fa-infinity"></i> Unlimited Classes</span>`;
        }
        
        let priceDisplay = `$${membership.price.toFixed(2)}`;
        if (membership.duration_days >= 30) {
            priceDisplay += membership.duration_days >= 365 ? '/year' : '/month';
        }
        
        membershipHTML += `
            <div class="membership-item">
                <div class="membership-details">
                    <div class="membership-title">${escapeHTML(membership.type)}</div>
                    <div class="membership-info">
                        ${statusText}
                        ${durationText ? `<span><i class="far fa-calendar-alt"></i> ${durationText}</span>` : ''}
                        <span><i class="fas fa-tag"></i> ${priceDisplay}</span>
                    </div>
                    ${membership.description ? `<p class="membership-description">${escapeHTML(membership.description)}</p>` : ''}
                </div>
                <div class="membership-actions">
                    <button title="Purchase" class="btn-small purchase-membership" data-type="${escapeHTML(membership.type)}">Purchase</button>
                </div>
            </div>
        `;
    });
    
    // Insert into first membership list (current memberships)
    const firstMembershipList = membershipList.querySelector('.membership-item')?.parentNode;
    if (firstMembershipList && membershipHTML) {
        // Keep the purchase history section if it exists, but replace the memberships
        const purchaseHistorySection = membershipsPanel.querySelector('.panel-header[style*="margin-top"]');
        
        if (purchaseHistorySection) {
            firstMembershipList.innerHTML = membershipHTML;
        } else {
            membershipList.innerHTML = membershipHTML;
        }
        
        // Add click handlers to purchase buttons
        document.querySelectorAll('.purchase-membership').forEach(btn => {
            btn.addEventListener('click', function() {
                const membershipType = this.getAttribute('data-type');
                openPurchaseModal('membership', membershipType);
            });
        });
    }
}

/**
 * Update private session packages display with current data from API
 */
function updateSessionPackagesDisplay(sessionPackages) {
    const sessionsPanel = document.getElementById('private-sessions-panel');
    if (!sessionsPanel) return;
    
    const packagesContainer = sessionsPanel.querySelector('.session-packages');
    if (!packagesContainer) return;
    
    // Use all session packages since they don't have a status field in the API response
    const activePackages = sessionPackages;
    
    // Clear existing packages
    packagesContainer.innerHTML = '';
    
    // Create HTML for each package
    activePackages.forEach(pkg => {
        const pricePerSession = pkg.sessions > 1 
            ? `$${(pkg.price / pkg.sessions).toFixed(2)} per session` 
            : '';
            
        const packageElement = document.createElement('div');
        packageElement.className = 'session-package-item';
        packageElement.innerHTML = `
            <div class="package-name">${escapeHTML(pkg.name)}</div>
            <div class="package-price">$${pkg.price.toFixed(2)}</div>
            <div class="package-details">${pricePerSession}</div>
            <a href="#" class="btn-small book-session-package" data-package="${escapeHTML(pkg.name)}">Book Now</a>
        `;
        
        packagesContainer.appendChild(packageElement);
    });
    
    // Add click handlers to book buttons
    document.querySelectorAll('.book-session-package').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const packageName = this.getAttribute('data-package');
            openBookingModal('session', packageName);
        });
    });
}

/**
 * Fetch pricing data for the homepage
 */
function fetchPricingDataForHomepage() {
    fetch('/api/pricing')
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch pricing data');
        }
        return response.text();
    })
    .then(responseText => {
        try {
            console.log('Raw response text:', responseText)
            // Parse the fixed JSON
            const data = JSON.parse(responseText);
            
            if (data.success && data.pricing) {
                // Log memberships data to check most_popular flag
                console.log('Memberships data:', data.pricing.memberships);
                console.log('Most popular check:', data.pricing.memberships.map(m => ({ type: m.type, most_popular: m.most_popular, mostPopularType: typeof m.most_popular })));
                
                // Update homepage memberships section
                updateHomepageMemberships(data.pricing.memberships);
                
                // Update homepage private sessions section if it exists
                updateHomepagePrivateSessions(data.pricing.sessionPackages);
                
                console.log('Homepage pricing data loaded successfully');
            } else {
                throw new Error(data.message || 'Failed to fetch pricing data');
            }
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            console.error('Response text:', responseText);
            throw parseError;
        }
    })
    .catch(error => {
        console.error('Error fetching pricing data for homepage:', error);
        
        // Show error message in pricing containers
        const pricingContainer = document.getElementById('pricing-container');
        const privateSessionsContainer = document.getElementById('private-pricing');
        
        if (pricingContainer) {
            pricingContainer.innerHTML = '<div class="pricing-error">Unable to load membership options. Please try again later.</div>';
        }
        
        if (privateSessionsContainer) {
            privateSessionsContainer.innerHTML = '<div class="pricing-error">Unable to load private session options. Please try again later.</div>';
        }
    });
}

/**
 * Update homepage memberships display
 */
function updateHomepageMemberships(memberships) {
    const pricingContainer = document.getElementById('pricing-container');
    if (!pricingContainer) return;
    
    // Clear loading indicator
    pricingContainer.innerHTML = '';
    
    // Get only active memberships
    const activeMemberships = memberships.filter(m => m.status === 'active');
    
    if (activeMemberships.length === 0) {
        pricingContainer.innerHTML = '<div class="pricing-empty">No membership options currently available.</div>';
        return;
    }
    
    // Create pricing cards for each membership
    activeMemberships.forEach((membership, index) => {
        let priceDisplay = `$${membership.price.toFixed(2)}`;
        let periodDisplay = '';
        
        if (membership.duration_days) {
            if (membership.duration_days >= 365) {
                // Annual
                priceDisplay += '/year';
                periodDisplay = 'per year';
            } else if (membership.duration_days >= 30) {
                // Monthly
                priceDisplay += '/month';
                periodDisplay = 'per month';
            } else {
                // Days
                periodDisplay = `for ${membership.duration_days} days`;
            }
        } else if (membership.classes) {
            // Class pack
            periodDisplay = `for ${membership.classes} classes`;
        } else {
            // Single class or other
            periodDisplay = 'per class';
        }
        
        // Generate features list based on membership properties
        let featuresHtml = '<ul>';
        
        // Add classes info
        if (membership.classes) {
            featuresHtml += `<li>${membership.classes} class visits</li>`;
            
            if (membership.duration_days) {
                featuresHtml += `<li>Valid for ${membership.duration_days > 30 ? Math.floor(membership.duration_days/30) + ' months' : membership.duration_days + ' days'}</li>`;
            }
        } else if (membership.duration_days) {
            featuresHtml += '<li>Unlimited classes</li>';
        }
        
        // Add additional features based on membership type
        if (membership.type.toLowerCase().includes('monthly') || membership.type.toLowerCase().includes('annual')) {
            featuresHtml += `
                <li>${membership.type.toLowerCase().includes('annual') ? '15%' : '10%'} off workshops</li>
                <li>Free mat rental</li>
            `;
            
            if (membership.type.toLowerCase().includes('annual')) {
                featuresHtml += `
                    <li>1 free private session</li>
                    <li>5% off retreats</li>
                `;
            } else {
                featuresHtml += '<li>Member-only events</li>';
            }
        } else {
            featuresHtml += `
                <li>All class types</li>
                <li>Mat rental available</li>
                <li>No commitment</li>
            `;
        }
        
        featuresHtml += '</ul>';
        
        // Create card element
        const cardDiv = document.createElement('div');
        cardDiv.className = 'pricing-card';
        
        // Add featured tag to membership marked as most popular
        // SQLite stores booleans as 0/1, so we need to explicitly check for 1
        if (membership.most_popular === 1 || membership.most_popular === '1' || membership.most_popular === true) {
            cardDiv.classList.add('featured');
        }
        
        cardDiv.innerHTML = `
            <div class="pricing-header">
                ${membership.most_popular === 1 || membership.most_popular === '1' || membership.most_popular === true ? 
                  '<span class="featured-tag">Most Popular</span>' : ''}
                <h3>${escapeHTML(membership.type)}</h3>
                <p class="price">${priceDisplay}</p>
                <p>${periodDisplay}</p>
            </div>
            <div class="pricing-features">
                ${featuresHtml}
            </div>
            <a href="#" class="btn pricing-btn" data-membership-type="${escapeHTML(membership.type)}" data-membership-price="${membership.price.toFixed(2)}">
                ${membership.duration_days >= 30 ? 'Subscribe' : 'Purchase'}
            </a>
        `;
        
        pricingContainer.appendChild(cardDiv);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.pricing-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const membershipType = this.getAttribute('data-membership-type');
            const membershipPrice = this.getAttribute('data-membership-price');
            
            if (this.textContent.trim() === 'Subscribe') {
                // Open subscription modal
                const modal = document.getElementById('subscription-modal');
                if (modal) {
                    document.getElementById('subscription-type').value = membershipType;
                    document.getElementById('subscription-price').value = `$${membershipPrice}`;
                    modal.style.display = 'block';
                }
            } else {
                // Open purchase modal
                const modal = document.getElementById('purchase-modal');
                if (modal) {
                    document.getElementById('purchase-type').value = membershipType;
                    document.getElementById('purchase-price').value = `$${membershipPrice}`;
                    modal.style.display = 'block';
                }
            }
        });
    });
}

/**
 * Update homepage private sessions display
 */
function updateHomepagePrivateSessions(sessionPackages) {
    const privatePricingContainer = document.getElementById('private-pricing');
    if (!privatePricingContainer) return;
    
    // Clear loading indicator
    privatePricingContainer.innerHTML = '';
    
    // Use all session packages since they don't have a status field in the API response
    const activePackages = sessionPackages;
    
    if (activePackages.length === 0) {
        privatePricingContainer.innerHTML = '<div class="pricing-empty">No private session packages currently available.</div>';
        return;
    }
    
    // Create private session options
    activePackages.forEach(pkg => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'private-option';
        
        const durationText = pkg.session_duration ? `${pkg.session_duration} minutes` : '';
        const pricePerSession = pkg.sessions > 1 ? `$${(pkg.price / pkg.sessions).toFixed(2)} per session` : durationText;
        
        optionDiv.innerHTML = `
            <h4>${escapeHTML(pkg.name)}</h4>
            <p class="price">$${pkg.price.toFixed(2)}</p>
            <p>${pricePerSession}</p>
            <a href="#" class="btn-small private-booking-btn" data-package="${escapeHTML(pkg.name)}">Book Now</a>
        `;
        
        privatePricingContainer.appendChild(optionDiv);
    });
    
    // Add event listeners to booking buttons
    document.querySelectorAll('.private-booking-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const packageName = this.getAttribute('data-package');
            
            // Show private booking modal
            const modal = document.getElementById('private-booking-modal');
            if (modal) {
                // Pre-select the package
                const sessionTypeSelect = document.getElementById('session-type');
                if (sessionTypeSelect) {
                    // Find option that contains the package name text
                    for (let i = 0; i < sessionTypeSelect.options.length; i++) {
                        if (sessionTypeSelect.options[i].text.includes(packageName)) {
                            sessionTypeSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                
                modal.style.display = 'block';
            }
        });
    });
}

/**
 * Update homepage private session packages display (legacy)
 */
function updateHomepageSessionPackages(sessionPackages) {
    console.warn('updateHomepageSessionPackages is deprecated. Use updateHomepagePrivateSessions instead.');
    updateHomepagePrivateSessions(sessionPackages);
}

/**
 * Open purchase modal with Stripe integration
 */
function openPurchaseModal(type, itemName, price) {
    console.log(`Opening purchase modal for ${type}: ${itemName} (${price})`);
    
    // Get modal and form elements
    const modal = document.getElementById('purchase-modal');
    if (!modal) {
        console.error('Purchase modal not found');
        return;
    }
    
    const form = document.getElementById('purchase-form');
    if (!form) {
        console.error('Purchase form not found');
        return;
    }
    
    // Set form values
    const typeInput = document.getElementById('purchase-type');
    const priceInput = document.getElementById('purchase-price');
    
    if (typeInput) typeInput.value = `${type}: ${itemName}`;
    if (priceInput) priceInput.value = price ? `$${price}` : 'Price upon request';
    
    // Pre-fill user information if available (logged in users)
    prefillUserInfo('purchase');
    
    // Initialize Stripe payment element
    if (window.stripePaymentHandler) {
        const numericPrice = parseFloat(price || '0');
        window.stripePaymentHandler.setupOneTimePayment(numericPrice, `${type}: ${itemName}`);
    } else {
        console.warn('Stripe payment handler not found');
    }
    
    // Show the modal
    modal.style.display = 'block';
    
    // Handle form submission if not already set up
    if (!form.hasAttribute('data-initialized')) {
        form.setAttribute('data-initialized', 'true');
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
            
            // Let Stripe payment handler handle the submission
            if (window.stripePaymentHandler) {
                try {
                    await window.stripePaymentHandler.handlePurchaseSubmit(e);
                } catch (error) {
                    console.error('Payment error:', error);
                    
                    // Re-enable the button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Complete Purchase';
                    }
                    
                    // Show error
                    const errorDiv = document.getElementById('payment-errors');
                    if (errorDiv) {
                        errorDiv.textContent = error.message || 'An error occurred processing your payment.';
                        errorDiv.style.display = 'block';
                    }
                }
            }
        });
    }
}

/**
 * Open subscription modal with Stripe Checkout
 */
function openSubscriptionModal(type, price) {
    console.log(`Opening subscription modal for ${type} (${price}/month)`);
    
    // Get modal and form elements
    const modal = document.getElementById('subscription-modal');
    if (!modal) {
        console.error('Subscription modal not found');
        return;
    }
    
    const form = document.getElementById('subscription-form');
    if (!form) {
        console.error('Subscription form not found');
        return;
    }
    
    // Set form values
    const typeInput = document.getElementById('subscription-type');
    const priceInput = document.getElementById('subscription-price');
    
    if (typeInput) typeInput.value = type;
    if (priceInput) priceInput.value = price ? `$${price}/month` : 'Price upon request';
    
    // Set start date to today
    const startDateInput = document.getElementById('subscription-start');
    if (startDateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        startDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    
    // Pre-fill user information if available
    prefillUserInfo('subscription');
    
    // Show the modal
    modal.style.display = 'block';
    
    // Handle form submission if not already set up
    if (!form.hasAttribute('data-initialized')) {
        form.setAttribute('data-initialized', 'true');
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Validate form
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
            
            // Handle subscription creation
            if (window.stripePaymentHandler) {
                try {
                    await window.stripePaymentHandler.handleSubscriptionSubmit(e);
                } catch (error) {
                    console.error('Subscription error:', error);
                    
                    // Re-enable the button
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Start Membership';
                    }
                    
                    // Show error as alert since subscription modal doesn't have an error element
                    alert(`Subscription Error: ${error.message || 'An error occurred processing your subscription.'}`);
                }
            } else {
                // Fallback if Stripe handler is not available
                alert('Payment processing is currently unavailable. Please try again later.');
                
                // Re-enable the button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Start Membership';
                }
            }
        });
    }
}

/**
 * Open booking modal for private sessions
 */
function openBookingModal(type, packageName) {
    console.log(`Opening booking modal for ${type}: ${packageName}`);
    
    // Show private booking modal
    const modal = document.getElementById('private-booking-modal');
    if (modal) {
        // Pre-select the package
        const sessionTypeSelect = document.getElementById('session-type');
        if (sessionTypeSelect) {
            // Find option that contains the package name text
            for (let i = 0; i < sessionTypeSelect.options.length; i++) {
                if (sessionTypeSelect.options[i].text.includes(packageName)) {
                    sessionTypeSelect.selectedIndex = i;
                    break;
                }
            }
        }
        
        modal.style.display = 'block';
    }
}

/**
 * Pre-fill user info if available (for logged in users)
 */
function prefillUserInfo(formType) {
    // Try to get user info from localStorage if available
    let user = null;
    try {
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
            user = JSON.parse(userInfo);
        }
    } catch (error) {
        console.warn('Error retrieving user info from localStorage:', error);
    }
    
    if (user) {
        // Prefill purchase form
        if (formType === 'purchase') {
            const nameField = document.getElementById('purchase-name');
            const emailField = document.getElementById('purchase-email');
            const phoneField = document.getElementById('purchase-phone');
            
            if (nameField) nameField.value = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            if (emailField) emailField.value = user.email || '';
            if (phoneField && user.phone) phoneField.value = user.phone;
        }
        
        // Prefill subscription form
        if (formType === 'subscription') {
            const nameField = document.getElementById('subscription-name');
            const emailField = document.getElementById('subscription-email');
            const phoneField = document.getElementById('subscription-phone');
            const addressField = document.getElementById('subscription-address');
            
            if (nameField) nameField.value = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            if (emailField) emailField.value = user.email || '';
            if (phoneField && user.phone) phoneField.value = user.phone;
            if (addressField && user.address) addressField.value = user.address;
        }
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
