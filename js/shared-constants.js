/**
 * Gabi Jyoti Yoga - Shared Constants
 * Centralized location for constants and enums used across the application
 */

// Session status enum
const SessionStatus = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    TENTATIVE: 'tentative',
    
    // Helper method to get all valid statuses
    getAllStatuses() {
        return [
            this.PENDING,
            this.CONFIRMED,
            this.CANCELLED, 
            this.COMPLETED,
            this.TENTATIVE
        ];
    },
    
    // Helper method to check if a status is valid
    isValid(status) {
        if (!status) return false;
        return this.getAllStatuses().includes(status.toLowerCase());
    }
};

// Export constants for use in both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SessionStatus
    };
} else {
    // Make available globally for browser
    window.SharedConstants = {
        SessionStatus
    };
}
