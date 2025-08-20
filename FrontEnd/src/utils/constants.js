// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Google Maps Configuration


// Form validation constants
export const VALIDATION_RULES = {
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
  },
  phone: {
    pattern: /^\+91[6-9]\d{9}$/,
  },
  travelTime: {
    min: 5,
    max: 180,
  },
  finalTime: {
    min: 10,
    max: 300,
  },
};

// Status messages
export const MESSAGES = {
  SUCCESS: {
    ALERT_CREATED: '✅ Alert created successfully! You will receive SMS notifications when threshold conditions are met.',
    ALERT_CANCELLED: '✅ Alert cancelled successfully!',
    AUTH_SUCCESS: 'Authentication successful! You can now create alerts with auto-booking.',
  },
  ERROR: {
    VALIDATION: 'Please fix the errors below',
    NETWORK: 'Network error. Please check your connection and try again.',
    AUTH_FAILED: 'Authentication failed. Please try again.',
    GENERIC: 'Something went wrong. Please try again.',
  },
  INFO: {
    REDIRECTING: '🔄 Redirecting to authenticate with Ola for auto-booking...',
    LOADING: 'Loading...',
    NO_ALERTS: 'No active alerts found for this username.',
  },
};

// Theme colors (matching Tailwind config)
export const THEME = {
  colors: {
    primary: '#2563eb',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
  },
};
