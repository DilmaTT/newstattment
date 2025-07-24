import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "./AuthDialog";
import { Settings } from "lucide-react"; // Import Settings icon
import { cn } from "@/lib/utils"; // Import cn utility

interface UserMenuProps {
  isMobileMode: boolean; // Add this prop
}

export const UserMenu = ({ isMobileMode }: UserMenuProps) => { // Destructure isMobileMode
  const { user, logout, isAuthenticated } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAuthDialogOpen(true)}
          className={cn(
            "flex items-center",
            isMobileMode ? "w-10 h-10 p-0 justify-center" : "gap-2", // Conditional styling for mobile icon button
            isMobileMode && "h-10" // Уменьшаем высоту для мобильного режима
          )}
        >
          {isMobileMode ? (
            <Settings className="h-4 w-4" /> // Gear icon for mobile unauthenticated
          ) : (
            <>
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  ?
                </AvatarFallback>
              </Avatar>
              Войти
            </>
          )}
        </Button>
        
        <AuthDialog 
          open={authDialogOpen} 
          onOpenChange={setAuthDialogOpen} 
        />
      </>
    );
  }

  const userInitial = user?.username?.charAt(0).toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "flex items-center gap-2",
            isMobileMode && "h-10" // Уменьшаем высоту для мобильного режима
          )}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          {user?.username}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={logout}>
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
