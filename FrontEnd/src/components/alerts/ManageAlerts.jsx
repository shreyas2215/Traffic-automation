import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Loading from '../ui/Loading';
import Card from '../ui/Card';
import AlertCard from './AlertCard';
import { useAlerts } from '../../hooks/useAlerts';
import clsx from 'clsx';

const ManageAlerts = () => {
  const navigate = useNavigate();
  const { getUserAlerts, cancelAlert, isLoading } = useAlerts();
  
  const [username, setUsername] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ active: 0, total: 0 });

  const handleLoadAlerts = async () => {
    if (!username.trim()) {
      setMessage('Please enter your username to load alerts');
      return;
    }

    try {
      setMessage('');
      const data = await getUserAlerts(username.trim());
      
      // Set ALL alerts, not just active ones
      setAlerts(data.alerts || []);
      
      // Count active alerts properly
      const activeCount = (data.alerts || []).filter(alert => alert.status === 'active').length;
      setStats({
        active: activeCount,
        total: data.alerts?.length || 0
      });
      
      if ((data.alerts || []).length === 0) {
        setMessage('No alerts found for this username.');
      } else {
        setMessage(`Found ${activeCount} active alert${activeCount === 1 ? '' : 's'} out of ${data.alerts.length} total`);
      }
    } catch (error) {
      setMessage(`Error loading alerts: ${error.message}`);
      setAlerts([]);
      setStats({ active: 0, total: 0 });
    }
  };

  const handleCancelAlert = async (alertId, origin, destination) => {
    const confirmMessage = `Are you sure you want to cancel this alert?\n\n🚗 ${origin} → ${destination}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await cancelAlert(username, alertId);
      
      if (result.success) {
        setMessage('✅ Alert cancelled successfully!');
        
        // Update the alert status to cancelled in the UI
        setAlerts(prev => prev.map(alert =>
          alert.id === alertId ? { ...alert, status: 'cancelled' } : alert
        ));
        
        // Decrease active count
        setStats(prev => ({ 
          ...prev, 
          active: Math.max(0, prev.active - 1) 
        }));
      } else {
        setMessage(`❌ Error: ${result.error || 'Failed to cancel alert'}`);
      }
    } catch (error) {
      setMessage(`❌ Error cancelling alert: ${error.message}`);
    }
  };

  const handleReactivateAlert = async (alertId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/alerts/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, alertId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage('✅ Alert reactivated successfully!');
        
        // Update the alert status to active in the UI
        setAlerts(prev => prev.map(alert =>
          alert.id === alertId ? { ...alert, status: 'active' } : alert
        ));
        
        // Increase active count
        setStats(prev => ({ 
          ...prev, 
          active: prev.active + 1 
        }));
      } else {
        setMessage(`❌ Error: ${result.error || 'Failed to reactivate alert'}`);
      }
    } catch (error) {
      setMessage(`❌ Error reactivating alert: ${error.message}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLoadAlerts();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Manage Your Alerts</h1>
        <p className="text-gray-600">View, cancel, and reactivate your traffic alerts</p>
      </div>

      {/* User Lookup */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Find Your Alerts</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                label="Your Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter the username you used when creating alerts"
                helpText="This is the same username you used to create alerts"
              />
            </div>
            
            <Button 
              onClick={handleLoadAlerts}
              disabled={isLoading || !username.trim()}
              isLoading={isLoading}
              className="self-end"
              size="lg"
            >
              🔍 Load My Alerts
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Message */}
      {message && (
        <Card>
          <div className={clsx(
            'p-4 rounded-lg',
            message.includes('❌') || message.includes('Error') 
              ? 'bg-red-50 text-red-800 border border-red-200'
              : message.includes('✅') || message.includes('Found')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          )}>
            <p className="font-medium">{message}</p>
          </div>
        </Card>
      )}

      {/* Stats */}
      {stats.total > 0 && (
        <Card>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Created</div>
            </div>
          </div>
        </Card>
      )}

      {/* Alerts List - NOW SHOWS ALL ALERTS */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            All Alerts ({alerts.length})
          </h2>
          
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div key={alert.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <AlertCard
                  alert={alert}
                  onCancel={() => handleCancelAlert(
                    alert.id, 
                    alert.origin_address, 
                    alert.destination_address
                  )}
                  onReactivate={handleReactivateAlert}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <Loading text="Loading your alerts..." size="lg" />
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          variant="outline"
          onClick={() => navigate('/')}
          size="lg"
        >
          ← Create New Alert
        </Button>
        
        {alerts.length > 0 && (
          <Button 
            variant="secondary"
            onClick={handleLoadAlerts}
            size="lg"
          >
            🔄 Refresh Alerts
          </Button>
        )}
      </div>

      {/* Footer */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          💡 Tip: You can reactivate cancelled/completed alerts to start monitoring again.
        </p>
      </div>
    </div>
  );
};

export default ManageAlerts;
