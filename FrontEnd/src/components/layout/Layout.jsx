import React from 'react';
import { useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🚦</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Traffic Alert System</h1>
                <p className="text-sm text-gray-600">Smart traffic monitoring & notifications</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {isHomePage ? '📝 Create Alert' : '📊 Manage Alerts'}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              🔒 Alerts auto-stop when SMS is sent.
            </p>
            <p className="text-xs text-gray-500">
              Remember your username to manage alerts • Built with React & Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
