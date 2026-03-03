import { Link, useLocation } from "wouter";
import { Zap, Settings, Link as LinkIcon, BookOpen, Library } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { name: "Brief", href: "/", icon: Zap },
    { name: "Library", href: "/library", icon: Library },
    { name: "Connect", href: "/connect", icon: LinkIcon },
    { name: "Playbooks", href: "/playbooks", icon: BookOpen, disabled: true },
    { name: "Settings", href: "/settings", icon: Settings, disabled: true },
  ];

  return (
    <div className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl flex flex-col h-full z-10 relative">
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(255,255,255,0.2)]">
          S
        </div>
        <span className="font-semibold tracking-tight text-lg">Social OS</span>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-2">
        <div className="text-xs font-mono text-muted-foreground mb-2 px-2 uppercase tracking-wider">Menu</div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          
          if (item.disabled) {
            return (
              <div 
                key={item.name}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground/50 cursor-not-allowed select-none"
              >
                <item.icon className="w-4 h-4" />
                <span className="font-medium text-sm">{item.name}</span>
                <span className="ml-auto text-[10px] font-mono border border-border/50 px-1.5 py-0.5 rounded text-muted-foreground/30">SOON</span>
              </div>
            );
          }

          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "text-primary bg-primary/10 font-medium" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}
                <item.icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                <span className="text-sm">{item.name}</span>
              </a>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=SocialOS&backgroundColor=transparent" alt="User" className="w-full h-full opacity-80 mix-blend-screen" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium">Operator</span>
            <span className="text-[10px] text-muted-foreground font-mono">Local Instance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
