import React, { useReducer, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Loading from '../ui/Loading';
import Card from '../ui/Card';
import { useAlerts } from '../../hooks/useAlerts';
import { useGooglePlaces } from '../../hooks/useGooglePlaces';
import clsx from 'clsx';
import { logging } from '../../utils/constants';

const initialState = {
  username: '',
  originAddress: '',
  destinationAddress: '',
  time: '',
  finalTime: '',
  autoBook: false,
  phone: '',
  errors: {},
  message: '',
  debugInfo: null,
  loading: false
};

function formReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.field]: action.value,
        errors: { ...state.errors, [action.field]: '' }
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_MESSAGE':
      return { ...state, message: action.message };
    case 'SET_DEBUG':
      return { ...state, debugInfo: action.debugInfo };
    case 'RESET_FORM':
      return { ...initialState, loading: false };
    case 'RESET_FORM_FIELDS':
      return {
        ...state,
        username: '',
        originAddress: '',
        destinationAddress: '',
        time: '',
        finalTime: '',
        autoBook: false,
        phone: '',
        errors: {},
        loading: false
        // Keep message and debugInfo visible
      };
    case 'CLEAR_MESSAGES':
      return { ...state, message: '', errors: {} };
    default:
      return state;
  }
}

const AlertForm = () => {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createAlert, isLoading } = useAlerts();

  useGooglePlaces(['originAddress', 'destinationAddress']);

  // OAuth callback handling
  useEffect(() => {
    if (
      searchParams.get('uber_auth') === 'success' ||
      searchParams.get('ola_auth') === 'success'
    ) {
      const pendingData = localStorage.getItem('pendingData');
      if (pendingData) {
        const data = JSON.parse(pendingData);
        localStorage.removeItem('pendingData');
        dispatch({ 
          type: 'SET_MESSAGE', 
          message: 'Authentication successful! Creating your alert now...' 
        });
        
        // Set form data from pending data
        Object.keys(data).forEach((field) => {
          dispatch({
            type: 'UPDATE_FIELD',
            field,
            value: data[field]
          });
        });
        
        handleCreateAlert(data);
      } else {
        dispatch({
          type: 'SET_MESSAGE',
          message: 'Authentication successful! You can now create alerts with auto-booking.'
        });
      }
      navigate('/', { replace: true });
    } else if (searchParams.has('error')) {
      const errorMsg = searchParams.get('error');
      dispatch({
        type: 'SET_MESSAGE',
        message: `Authentication failed: ${errorMsg}`
      });

      const pendingData = localStorage.getItem('pendingData');
      if (pendingData) {
        const data = JSON.parse(pendingData);
        Object.keys(data).forEach((field) => {
          dispatch({
            type: 'UPDATE_FIELD',
            field,
            value: data[field]
          });
        });
        localStorage.removeItem('pendingData');
      }
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line
  }, [searchParams, navigate]);

  const validateForm = () => {
    const errors = {};
    
    if (!state.username?.trim()) {
      errors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(state.username)) {
      errors.username = '3-20 characters, letters, numbers, underscore only';
    }
    
    if (!state.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+91[6-9]\d{9}$/.test(state.phone)) {
      errors.phone = 'Please enter a valid Indian phone number (+91XXXXXXXXXX)';
    }
    
    if (!state.originAddress?.trim()) {
      errors.originAddress = 'Origin address is required';
    }
    
    if (!state.destinationAddress?.trim()) {
      errors.destinationAddress = 'Destination address is required';
    }
    
    if (!state.time || state.time <= 0 || state.time > 180) {
      errors.time = 'Please enter a valid time between 1-180 minutes';
    }
    
    if (state.finalTime &&  state.finalTime > 300) {
      errors.finalTime = 'Final time must be less than 300 minutes';
    }
    
    return errors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    dispatch({
      type: 'UPDATE_FIELD',
      field: name,
      value: type === 'checkbox' ? checked : value
    });
  };

  const handleCreateAlert = async (payload) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const response = await createAlert(payload);
      dispatch({
        type: 'SET_MESSAGE',
        message: '✅ Alert created successfully! You will receive SMS notifications when threshold conditions are met.'
      });
      dispatch({ type: 'SET_DEBUG', debugInfo: response });

      if (response?.alertId || response?.id) {
        localStorage.setItem('lastAlert', response.alertId || response.id);
      }
      
      // Show success message for 4 seconds, then reset only form fields
      setTimeout(() => {
        dispatch({ type: 'RESET_FORM_FIELDS' });
      }, 4000);
      
    } catch (err) {
      logging('Error creating alert:', err);
      dispatch({
        type: 'SET_MESSAGE',
        message: `❌ Failed to create alert: ${err.message}`
      });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      dispatch({ type: 'SET_MESSAGE', message: 'Please fix the errors below' });
      return;
    }
    
    dispatch({ type: 'CLEAR_MESSAGES' });

    // Handle auto-booking authentication
    if (state.autoBook) {
      try {
        const response = await fetch('http://localhost:3001`/auth/ola/status');
        const authData = await response.json();
        
        if (!authData.authenticated) {
          localStorage.setItem('pendingData', JSON.stringify(state));
          dispatch({
            type: 'SET_MESSAGE',
            message: '🔄 Redirecting to authenticate with Ola for auto-booking...'
          });
          window.location.href = `http://localhost:3001/auth/ola?username=${encodeURIComponent(
            state.username
          )}`;
          return;
        }
      } catch {
        localStorage.setItem('pendingData', JSON.stringify(state));
        dispatch({
          type: 'SET_MESSAGE',
          message: '🔄 Redirecting to authenticate with Ola for auto-booking...'
        });
        window.location.href = `http://localhost:3001/auth/ola?username=${encodeURIComponent(
          state.username
        )}`;
        return;
      }
    }

    await handleCreateAlert(state);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🚦 Traffic Alert System</h1>
        <p className="text-gray-600">Get SMS notifications when it's the perfect time to leave</p>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* User Details */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="px-2 text-lg font-semibold text-gray-800">👤 User Details</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Username"
                name="username"
                value={state.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                error={state.errors.username}
                helpText="Used to manage your alerts later"
                required
              />
              
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={state.phone}
                onChange={handleChange}
                placeholder="+91XXXXXXXXXX"
                error={state.errors.phone}
                helpText="We'll send SMS alerts to this number"
                required
              />
            </div>
          </fieldset>

          {/* Trip Details */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="px-2 text-lg font-semibold text-gray-800">🗺️ Trip Details</legend>
            
            <Input
              label="Starting Point"
              id="originAddress"
              name="originAddress"
              value={state.originAddress}
              onChange={handleChange}
              placeholder="Enter pickup location"
              error={state.errors.originAddress}
              helpText="Where you'll start your journey"
              required
            />
            
            <Input
              label="Destination"
              id="destinationAddress"
              name="destinationAddress"
              value={state.destinationAddress}
              onChange={handleChange}
              placeholder="e.g., MG Road, Bengaluru"
              error={state.errors.destinationAddress}
              helpText="Where you need to reach"
              required
            />
          </fieldset>

          {/* Alert Settings */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="px-2 text-lg font-semibold text-gray-800">⚙️ Alert Settings</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Max Travel Time"
                name="time"
                type="number"
                min="5"
                max="180"
                step="1"
                value={state.time}
                onChange={handleChange}
                placeholder="25"
                error={state.errors.time}
                helpText="Alert when travel time ≤ this (in minutes)"
                required
              />
              
              <Input
                label="Cancel After"
                name="finalTime"
                type="number"
                min="10"
                max="300"
                step="1"
                value={state.finalTime}
                onChange={handleChange}
                placeholder="120"
                error={state.errors.finalTime}
                helpText="Auto-cancel alert after this many minutes (optional)"
              />
            </div>
            
            <div className="flex items-start space-x-3">
              <input
                id="autoBook"
                name="autoBook"
                type="checkbox"
                checked={state.autoBook}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
              />
              <div className="flex-1">
                <label htmlFor="autoBook" className="text-sm font-medium text-gray-700 cursor-pointer">
                  🚕 Auto-book a cab when threshold is met
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Requires Ola authentication. We'll book a ride automatically when conditions are perfect.
                </p>
              </div>
            </div>
          </fieldset>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              type="submit" 
              isLoading={isLoading || state.loading}
              className="flex-1"
              size="lg"
            >
              {(isLoading || state.loading) ? 'Creating Alert...' : '🚀 Create Alert'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => navigate('/manage')}
              className="flex-1"
              size="lg"
            >
              📊 Manage Alerts
            </Button>
          </div>
        </form>
      </Card>

      {/* Status Messages */}
      {((isLoading || state.loading) || state.message || state.debugInfo) && (
        <Card className="space-y-4">
          {(isLoading || state.loading) && <Loading text="Creating your alert..." />}
          
          {state.message && (
            <div className={clsx(
              'p-4 rounded-lg',
              state.message.includes('❌') || state.message.includes('failed') 
                ? 'bg-red-50 text-red-800 border border-red-200'
                : state.message.includes('✅') || state.message.includes('successful')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            )}>
              <p className="font-medium">{state.message}</p>
            </div>
          )}
          
          {state.debugInfo && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                🔍 Debug Information
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40 text-gray-700">
                {JSON.stringify(state.debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </Card>
      )}
    </div>
  );
};

export default AlertForm;
