/**
 * Stripe Payment Integration
 * Handles client-side payment processing and subscription management
 */

class StripePaymentHandler {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.paymentElement = null;
    this.cardElement = null;
    this.initialized = false;

    // DOM Elements for one-time payments
    this.purchaseForm = document.getElementById('purchase-form');
    this.purchaseSubmitBtn = this.purchaseForm?.querySelector('button[type="submit"]');
    this.purchaseType = document.getElementById('purchase-type');
    this.purchasePrice = document.getElementById('purchase-price');
    this.purchaseName = document.getElementById('purchase-name');
    this.purchaseEmail = document.getElementById('purchase-email');
    
    // DOM Elements for subscriptions
    this.subscriptionForm = document.getElementById('subscription-form');
    this.subscriptionSubmitBtn = this.subscriptionForm?.querySelector('button[type="submit"]');
    this.subscriptionType = document.getElementById('subscription-type');
    this.subscriptionPrice = document.getElementById('subscription-price');
    this.subscriptionName = document.getElementById('subscription-name');
    this.subscriptionEmail = document.getElementById('subscription-email');

    // Payment UI elements
    this.oneTimePaymentSection = document.querySelector('#purchase-modal .payment-section');
    this.subscriptionPaymentSection = document.querySelector('#subscription-modal .payment-section');
    
    // Modals
    this.purchaseModal = document.getElementById('purchase-modal');
    this.subscriptionModal = document.getElementById('subscription-modal');
    
    // Event bindings
    this.bindEvents();
  }

  /**
   * Initialize Stripe
   */
  async initialize() {
    try {
      // Fetch the Stripe publishable key from the server
      const response = await fetch('/api/stripe/config');
      const { publishableKey } = await response.json();
      
      if (!publishableKey) {
        console.error('Stripe publishable key is not available');
        this.showPaymentError('Payment system is not properly configured. Please try again later.');
        return false;
      }
      
      // Initialize Stripe
      this.stripe = Stripe(publishableKey);
      this.initialized = true;
      
      console.log('Stripe initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      this.showPaymentError('Failed to initialize payment system. Please try again later.');
      return false;
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // One-time payment form submission
    if (this.purchaseForm) {
      this.purchaseForm.addEventListener('submit', (e) => this.handlePurchaseSubmit(e));
    }
    
    // Subscription form submission
    if (this.subscriptionForm) {
      this.subscriptionForm.addEventListener('submit', (e) => this.handleSubscriptionSubmit(e));
    }
    
    // Close modals on X click or click outside
    document.querySelectorAll('.close-modal').forEach(closeBtn => {
      closeBtn.addEventListener('click', () => {
        if (this.purchaseModal) this.purchaseModal.style.display = 'none';
        if (this.subscriptionModal) this.subscriptionModal.style.display = 'none';
      });
    });
    
    window.addEventListener('click', (event) => {
      if (event.target === this.purchaseModal) {
        this.purchaseModal.style.display = 'none';
      }
      if (event.target === this.subscriptionModal) {
        this.subscriptionModal.style.display = 'none';
      }
    });
  }
  
  /**
   * Setup payment element for one-time payments
   */
  async setupOneTimePayment(amount, itemName) {
    if (!this.initialized && !(await this.initialize())) {
      return false;
    }
    
    try {
      // Clear any existing payment elements
      if (this.oneTimePaymentSection) {
        this.oneTimePaymentSection.innerHTML = `
          <h3>Payment Details</h3>
          <div id="payment-element-container" class="form-group">
            <div id="payment-element"></div>
          </div>
          <div id="payment-errors" class="payment-errors"></div>
        `;
      }
      
      // Create payment intent on the server
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'usd',
          description: `Payment for ${itemName}`,
          metadata: {
            payment_type: 'purchase',
            item_name: itemName
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      const { clientSecret } = await response.json();
      
      if (!clientSecret) {
        throw new Error('No client secret received');
      }
      
      // Store client secret for later use during form submission
      this.clientSecret = clientSecret;
      
      // Create elements instance
      this.elements = this.stripe.elements({
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#6e7c90',
            colorBackground: '#ffffff',
            colorText: '#30313d',
            colorDanger: '#df1b41',
            fontFamily: 'Roboto, Open Sans, Segoe UI, sans-serif',
            spacingUnit: '4px',
            borderRadius: '4px'
          }
        }
      });
      
      // Create and mount the Payment Element
      this.paymentElement = this.elements.create('payment');
      this.paymentElement.mount('#payment-element');
      
      return true;
    } catch (error) {
      console.error('Error setting up payment:', error);
      this.showPaymentError('Failed to set up payment. Please try again later.');
      return false;
    }
  }
  
  /**
   * Handle purchase form submission
   */
  async handlePurchaseSubmit(e) {
    if (e) e.preventDefault();
    
    if (!this.initialized && !(await this.initialize())) {
      return;
    }
    
    // Form may have been updated since initialization, so get fresh references
    this.purchaseForm = document.getElementById('purchase-form');
    this.purchaseSubmitBtn = this.purchaseForm?.querySelector('button[type="submit"]');
    this.purchaseType = document.getElementById('purchase-type');
    this.purchasePrice = document.getElementById('purchase-price');
    this.purchaseName = document.getElementById('purchase-name');
    this.purchaseEmail = document.getElementById('purchase-email');
    
    if (!this.clientSecret) {
      this.showPaymentError('Payment not properly set up. Please try again.');
      return;
    }
    
    // Disable form submission to prevent multiple clicks
    if (this.purchaseSubmitBtn) {
      this.purchaseSubmitBtn.disabled = true;
      this.purchaseSubmitBtn.textContent = 'Processing...';
    }
    
    const name = this.purchaseName?.value || '';
    const email = this.purchaseEmail?.value || '';
    
    try {
      const { error } = await this.stripe.confirmPayment({
        elements: this.elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success.html`,
          receipt_email: email,
          payment_method_data: {
            billing_details: {
              name,
              email
            }
          }
        },
        redirect: 'if_required'
      });
      
      if (error) {
        throw error;
      } else {
        // Payment succeeded, but no redirect occurred
        this.handleSuccessfulPayment();
      }
    } catch (error) {
      console.error('Payment failed:', error);
      this.showPaymentError(error.message || 'Payment failed. Please try again.');
      
      // Re-enable the button
      if (this.purchaseSubmitBtn) {
        this.purchaseSubmitBtn.disabled = false;
        this.purchaseSubmitBtn.textContent = 'Complete Purchase';
      }
    }
  }
  
  /**
   * Handle subscription form submission
   */
  async handleSubscriptionSubmit(e) {
    if (e) e.preventDefault();
    
    if (!this.initialized && !(await this.initialize())) {
      return;
    }
    
    // Form may have been updated since initialization, so get fresh references
    this.purchaseForm = document.getElementById('purchase-form');
    this.purchaseSubmitBtn = this.purchaseForm?.querySelector('button[type="submit"]');
    this.purchaseType = document.getElementById('purchase-type');
    this.purchasePrice = document.getElementById('purchase-price');
    this.purchaseName = document.getElementById('purchase-name');
    this.purchaseEmail = document.getElementById('purchase-email');
    
    // Same for subscription form elements
    this.subscriptionForm = document.getElementById('subscription-form');
    this.subscriptionSubmitBtn = this.subscriptionForm?.querySelector('button[type="submit"]');
    this.subscriptionType = document.getElementById('subscription-type');
    this.subscriptionPrice = document.getElementById('subscription-price');
    this.subscriptionName = document.getElementById('subscription-name');
    this.subscriptionEmail = document.getElementById('subscription-email');
    
    const name = this.subscriptionName?.value || '';
    const email = this.subscriptionEmail?.value || '';
    const subscriptionType = this.subscriptionType?.value || '';
    const price = this.subscriptionPrice?.value || '';
    
    // Disable form submission to prevent multiple clicks
    if (this.subscriptionSubmitBtn) {
      this.subscriptionSubmitBtn.disabled = true;
      this.subscriptionSubmitBtn.textContent = 'Processing...';
    }
    
    try {
      // Determine price ID based on subscription type
      // In a real implementation, you'd have a mapping of subscription types to Stripe price IDs
      // or fetch the price ID from your database/API
      const priceId = await this.getPriceIdForSubscription(subscriptionType, price);
      
      if (!priceId) {
        throw new Error('Invalid subscription type');
      }
      
      // Create checkout session on the server
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          customerName: name,
          customerEmail: email,
          successUrl: `${window.location.origin}/payment-success.html`,
          cancelUrl: `${window.location.origin}/payment-cancel.html`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create subscription');
      }
      
      const { sessionId, url } = await response.json();
      
      if (url) {
        // Redirect to the Stripe Checkout page
        window.location.href = url;
      } else {
        // Fallback to Stripe Checkout redirect
        const { error } = await this.stripe.redirectToCheckout({
          sessionId
        });
        
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Subscription failed:', error);
      this.showPaymentError(error.message || 'Subscription failed. Please try again.');
      
      // Re-enable the button
      if (this.subscriptionSubmitBtn) {
        this.subscriptionSubmitBtn.disabled = false;
        this.subscriptionSubmitBtn.textContent = 'Start Membership';
      }
    }
  }
  
  /**
   * Get price ID for subscription
   * In a real implementation, this would query your database or API
   */
  async getPriceIdForSubscription(subscriptionType, price) {
    // This is a placeholder. In a real app, you would:
    // 1. Fetch price IDs from your server based on subscription type
    // 2. Use the returned price ID for the checkout session
    // 3. May also want to validate the price on the server side
    
    // For demo purposes, you could use test price IDs from your Stripe dashboard
    const mockPriceIdMap = {
      'Monthly Unlimited': 'price_monthly',
      'Annual Unlimited': 'price_annual',
      'Class Pack (10 classes)': 'price_classpack_10',
      'Class Pack (20 classes)': 'price_classpack_20',
    };
    
    return mockPriceIdMap[subscriptionType] || 'price_default';
  }
  
  /**
   * Handle successful payment
   */
  handleSuccessfulPayment() {
    // Hide the modal
    if (this.purchaseModal) {
      this.purchaseModal.style.display = 'none';
    }
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'payment-success-overlay';
    successMsg.innerHTML = `
      <div class="payment-success-content">
        <i class="fas fa-check-circle"></i>
        <h2>Payment Successful!</h2>
        <p>Thank you for your purchase. A confirmation email has been sent to your inbox.</p>
        <button class="btn close-success">Close</button>
      </div>
    `;
    
    document.body.appendChild(successMsg);
    
    // Add close button functionality
    const closeBtn = successMsg.querySelector('.close-success');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(successMsg);
        location.reload(); // Reload to refresh the page state
      });
    }
  }
  
  /**
   * Show payment error message
   */
  showPaymentError(message) {
    const errorElement = document.getElementById('payment-errors');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    } else {
      alert(`Payment Error: ${message}`);
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  window.stripePaymentHandler = new StripePaymentHandler();
});
