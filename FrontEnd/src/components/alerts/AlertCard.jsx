import React, { useState } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';

const AlertCard = ({ alert, onCancel, onReactivate }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  const handleCancel = async () => {
    setIsDeleting(true);
    try {
      await onCancel();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await onReactivate(alert.id);
    } finally {
      setIsReactivating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
      expired: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return badges[status] || badges.active;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="space-y-4">
        
        {/* Header with route */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(alert.status)}`}>
                {alert.status?.toUpperCase() || 'ACTIVE'}
              </span>
              {alert.auto_book && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  AUTO-BOOK
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              🚗 Journey Route
            </h3>
            <div className="text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 font-medium">📍 From:</span>
                <span>{alert.origin_address}</span>
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-red-600 font-medium">🎯 To:</span>
                <span>{alert.destination_address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-gray-500">Max Time</div>
            <div className="font-semibold text-primary-600">
              ⏱️ {alert.threshold_minutes} min
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-500">Final Limit</div>
            <div className="font-semibold text-orange-600">
              ⏰ {alert.final_threshold || 'None'} min
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-500">Created</div>
            <div className="font-semibold text-gray-700">
              📅 {formatDate(alert.created_at)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-500">Last Check</div>
            <div className="font-semibold text-gray-700">
              {alert.last_checked 
                ? `🔍 ${formatDate(alert.last_checked)}`
                : '⏳ Not yet'
              }
            </div>
          </div>
        </div>

        {/* Current Status */}
        {alert.last_duration && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm">
              <span className="text-gray-600">Latest traffic time:</span>
              <span className="font-semibold text-gray-900 ml-2">
                {alert.last_duration} minutes
              </span>
              {alert.last_duration <= alert.threshold_minutes && (
                <span className="text-green-600 font-medium ml-2">✅ Ready to go!</span>
              )}
              {alert.last_duration > alert.threshold_minutes && (
                <span className="text-orange-600 font-medium ml-2">⏳ Still monitoring...</span>
              )}
            </div>
          </div>
        )}

        {/* Settings Summary */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
            📱 SMS: {alert.phone}
          </span>
          {alert.auto_book ? (
            <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
              🚕 Auto-booking enabled
            </span>
          ) : (
            <span className="bg-gray-50 text-gray-700 px-2 py-1 rounded">
              📱 Manual booking only
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Cancel Button (for active alerts) */}
            {alert.status === 'active' && (
              <Button
                variant="danger"
                onClick={handleCancel}
                isLoading={isDeleting}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                {isDeleting ? 'Cancelling...' : '🗑️ Cancel Alert'}
              </Button>
            )}

            {/* Reactivate Button (for non-active alerts) */}
            {alert.status !== 'active' && (
              <Button
                variant="success"
                onClick={handleReactivate}
                isLoading={isReactivating}
                disabled={isReactivating}
                className="w-full sm:w-auto"
              >
                {isReactivating ? 'Reactivating...' : '🔄 Reactivate Alert'}
              </Button>
            )}
          </div>
          
          {alert.status !== 'active' && (
            <p className="text-xs text-gray-500 mt-2">
              This alert is {alert.status}. You can reactivate it to start monitoring again.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AlertCard;
