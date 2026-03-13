import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/home";

// 🚀 Lazy-load secondary pages — not needed on initial load
const FAQ = lazy(() => import("@/pages/faq"));
const Privacy = lazy(() => import("@/pages/privacy"));
const NotFound = lazy(() => import("@/pages/not-found"));

// 🚀 Lazy-load Toaster — defers @radix-ui/react-toast until a toast fires
const LazyToaster = lazy(() =>
  import("@/components/ui/toaster").then((m) => ({ default: m.Toaster }))
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/faq">
        <Suspense fallback={null}><FAQ /></Suspense>
      </Route>
      <Route path="/privacy">
        <Suspense fallback={null}><Privacy /></Suspense>
      </Route>
      <Route path="/:countryCode" component={Home} />
      <Route>
        <Suspense fallback={null}><NotFound /></Suspense>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <LazyToaster />
      </Suspense>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
