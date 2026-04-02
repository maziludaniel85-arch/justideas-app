import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ReactNode } from "react";
import { Button } from "./ui/button";
import { FileText, CreditCard, User, LayoutDashboard, LogOut, Building } from "lucide-react";
import { Spinner } from "./ui/spinner";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { profil, logout, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner className="size-8" />
      </div>
    );
  }

  // Redirect to login if not authenticated on a protected route
  if (error || !profil) {
    if (location !== "/autentificare" && location !== "/inregistrare") {
      window.location.href = "/autentificare";
      return null;
    }
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dosare", label: "Dosare", icon: FileText },
    { href: "/plati", label: "Plăți", icon: CreditCard },
    { href: "/profil", label: "Profil", icon: User },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border hidden md:flex">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sidebar-primary font-bold text-xl">
            <Building className="h-6 w-6" />
            <span>JustIdeas</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = location === link.href || location.startsWith(`${link.href}/`);
            const Icon = link.icon;
            
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold uppercase">
              {profil?.nume?.[0]}{profil?.prenume?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profil?.nume} {profil?.prenume}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{profil?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground/80 hover:text-white hover:bg-sidebar-accent"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Deconectare
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-sidebar text-sidebar-foreground p-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sidebar-primary font-bold text-lg">
            <Building className="h-5 w-5" />
            <span>JustIdeas</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={logout} className="text-sidebar-foreground">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
