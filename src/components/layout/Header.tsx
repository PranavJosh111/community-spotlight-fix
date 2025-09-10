import { useState } from 'react';
import { MapPin, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationsDialog from '@/components/notifications/NotificationsDialog';

const Header = () => {
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-8 w-8 text-civic-blue" />
          <div>
            <h1 className="text-xl font-bold text-foreground">CivicSense</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Community Infrastructure Reporting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationsDialog 
            unreadCount={unreadCount} 
            onUnreadCountChange={setUnreadCount}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <span className="font-medium">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;