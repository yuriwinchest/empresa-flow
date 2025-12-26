import { SidebarTrigger } from "@/components/ui/sidebar";
import { CompanySelector } from "@/components/CompanySelector";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { user } = useAuth();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-background px-4">
      <SidebarTrigger />
      
      {title && (
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      )}
      
      <div className="ml-auto flex items-center gap-4">
        <CompanySelector />
        
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.email ? getInitials(user.email) : "US"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
