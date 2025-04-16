import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  MessageSquare, 
  FileText, 
  LogOut,
  Mic,
  BarChart,
  FileBarChart,
  Zap,
  TrendingUp,
  HelpCircle,
  LifeBuoy,
  Brain,
  Volume2
} from 'lucide-react';
import logo from '../assets/logo.svg';

const DashboardLayout = () => {
  const location = useLocation();
  
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Customers', path: '/dashboard/customers' },
    { icon: MessageSquare, label: 'Conversations', path: '/dashboard/conversations' },
    { icon: Mic, label: 'Voice Settings', path: '/dashboard/voice' },
    { icon: Volume2, label: 'Voice Analytics', path: '/dashboard/voice-analytics' },
    { icon: Brain, label: 'AI Training', path: '/dashboard/ai-training' },
    { icon: BarChart, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: FileBarChart, label: 'Reports', path: '/dashboard/reports' },
    { icon: Zap, label: 'Performance', path: '/dashboard/performance' },
    { icon: TrendingUp, label: 'Trends', path: '/dashboard/trends' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
    { icon: HelpCircle, label: 'Help Center', path: '/dashboard/help' },
    { icon: LifeBuoy, label: 'Support', path: '/dashboard/support' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <img src={logo} alt="B2B Logo" className="w-8 h-8" />
            <span className="text-xl font-bold bg-gradient-to-r from-black to-[#9d00ff] bg-clip-text text-transparent">
              B2B Admin
            </span>
          </Link>
        </div>
        
        <nav className="mt-8">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-[#9d00ff] transition-colors ${
                  isActive ? 'bg-gray-50 text-[#9d00ff] border-r-4 border-[#9d00ff]' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 w-64 p-4">
          <button className="flex items-center space-x-2 text-gray-600 hover:text-[#9d00ff] transition-colors w-full px-6 py-3">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;