import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import FAQ from "@/pages/faq";
import Privacy from "@/pages/privacy";
import NotFound from "@/pages/not-found";

// 🚀 Lazy-load Toaster to remove 178KB @radix-ui/react-toast from synchronous bundle
const LazyToaster = lazy(() =>
  import("@/components/ui/toaster").then((m) => ({ default: m.Toaster }))
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/:countryCode" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense fallback={null}>
          <LazyToaster />
        </Suspense>
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
