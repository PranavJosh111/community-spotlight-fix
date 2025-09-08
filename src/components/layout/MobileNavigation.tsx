import { Home, Plus, MapPin, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const MobileNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/map', icon: MapPin, label: 'Map' },
    { path: '/report', icon: Plus, label: 'Report' },
    { path: '/notifications', icon: Bell, label: 'Alerts' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="grid grid-cols-5 gap-1 p-2">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Button
            key={path}
            variant="ghost"
            size="sm"
            onClick={() => navigate(path)}
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-2",
              location.pathname === path ? "text-civic-blue" : "text-muted-foreground"
            )}
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default MobileNavigation;