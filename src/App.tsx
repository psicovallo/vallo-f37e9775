import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import LandingPage from "@/pages/LandingPage";
import ManifestoPage from "@/pages/ManifestoPage";
import HomePage from "@/pages/HomePage";
import RemindersPage from "@/pages/RemindersPage";
import NotesPage from "@/pages/NotesPage";
import MessagesPage from "@/pages/MessagesPage";
import AdminPage from "@/pages/AdminPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import QuestionPage from "@/pages/QuestionPage";
import ContractPage from "@/pages/ContractPage";
import SfogoPage from "@/pages/SfogoPage";
import SfogoQuestionPage from "@/pages/SfogoQuestionPage";
import SOSConflittiPage from "@/pages/SOSConflittiPage";
import DNAQuestionPage from "@/pages/DNAQuestionPage";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/manifesto" element={<ManifestoPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<AppLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/question" element={<QuestionPage />} />
              <Route path="/contract" element={<ContractPage />} />
              <Route path="/sfogo" element={<SfogoPage />} />
              <Route path="/sfogo-question" element={<SfogoQuestionPage />} />
              <Route path="/sos-conflitti" element={<SOSConflittiPage />} />
              <Route path="/dna-question" element={<DNAQuestionPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/landing" element={<LandingPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
