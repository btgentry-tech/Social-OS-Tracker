import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import Connect from "@/pages/connect";
import Library from "@/pages/library";
import Playbooks from "@/pages/playbooks";
import Settings from "@/pages/settings";
import Sidebar from "@/components/Sidebar";

function Router() {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background/50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] pointer-events-none" />
        <div className="relative h-full">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/connect" component={Connect} />
            <Route path="/library" component={Library} />
            <Route path="/playbooks" component={Playbooks} />
            <Route path="/settings" component={Settings} />
            <Route>
              <div className="flex items-center justify-center h-full">
                <h1 className="text-2xl font-mono text-muted-foreground">404 - Not Found</h1>
              </div>
            </Route>
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
