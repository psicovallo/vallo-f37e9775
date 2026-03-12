import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({ users: 0, messages: 0, notes: 0, reminders: 0 });

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('notes').select('id', { count: 'exact', head: true }),
      supabase.from('reminders').select('id', { count: 'exact', head: true }),
    ]).then(([p, m, n, r]) => {
      setStats({
        users: p.count || 0,
        messages: m.count || 0,
        notes: n.count || 0,
        reminders: r.count || 0,
      });
    });
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/home" replace />;

  return (
    <div className="mx-auto max-w-lg px-4 pt-12">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Admin</h1>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(stats).map(([key, val]) => (
          <div key={key} className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-3xl font-bold text-primary">{val}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">{key}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
