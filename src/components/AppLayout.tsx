import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/BottomNav';
import GoogleTranslate from '@/components/GoogleTranslate';

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [linguaMadre, setLinguaMadre] = useState('italiano');

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('lingua_madre').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setLinguaMadre((data as any).lingua_madre || 'italiano');
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background pb-20">
      <GoogleTranslate language={linguaMadre} />
      <Outlet />
      <BottomNav />
    </div>
  );
}
