import { useState } from 'react';
import { API_BASE_URL } from '../utils/constants';

export const useAlerts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = async (url, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errorData || response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
      
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createAlert = async (alertData) => {
    return makeRequest(`${API_BASE_URL}/api/alerts`, {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
  };

  const getUserAlerts = async (username) => {
    return makeRequest(`${API_BASE_URL}/api/alerts/user/${encodeURIComponent(username)}/allalerts`);
  };

  const cancelAlert = async (username, alertId) => {
    return makeRequest(`${API_BASE_URL}/api/alerts/cancel`, {
      method: 'POST',
      body: JSON.stringify({ username, alertId }),
    });
  };

  const checkAuthStatus = async () => {
    return makeRequest(`${API_BASE_URL}/auth/ola/status`);
  };

  return {
    createAlert,
    getUserAlerts,
    cancelAlert,
    checkAuthStatus,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};

export const reactivateAlert = async (username, alertId) => {
  const res = await fetch(`${API_BASE_URL}/api/alerts/reactivate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, alertId }),
  });
  return await res.json();
};
