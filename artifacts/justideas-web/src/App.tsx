import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import Autentificare from "@/pages/autentificare";
import Inregistrare from "@/pages/inregistrare";
import Dashboard from "@/pages/dashboard";
import Dosare from "@/pages/dosare";
import DosarNou from "@/pages/dosar-nou";
import Plati from "@/pages/plati";
import Profil from "@/pages/profil";
import DosarWizard from "@/pages/dosar-wizard";

const queryClient = new QueryClient();

// Setup API token getter
setAuthTokenGetter(() => localStorage.getItem("justideas_token"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/autentificare" component={Autentificare} />
      <Route path="/inregistrare" component={Inregistrare} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/dosare">
        <Layout><Dosare /></Layout>
      </Route>
      <Route path="/dosare/nou">
        <Layout><DosarNou /></Layout>
      </Route>
      <Route path="/dosare/:id">
        <Layout><DosarWizard /></Layout>
      </Route>
      <Route path="/plati">
        <Layout><Plati /></Layout>
      </Route>
      <Route path="/profil">
        <Layout><Profil /></Layout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
