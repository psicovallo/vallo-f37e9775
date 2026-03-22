import { NavLink, useLocation } from 'react-router-dom';
import { Home, Bell, StickyNote, MessageSquare, Shield, Flame, PenLine, Swords } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const tabs = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/question', label: 'Domanda', icon: Flame },
  { to: '/sfogo', label: 'Sfogo', icon: PenLine },
  { to: '/reminders', label: 'Promemoria', icon: Bell },
  { to: '/messages', label: 'Messaggi', icon: MessageSquare },
];

export default function BottomNav() {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const allTabs = isAdmin ? [...tabs, { to: '/admin', label: 'Admin', icon: Shield }] : tabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom">
      <div className="mx-auto flex max-w-lg justify-around py-2">
        {allTabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-2 py-1"
            >
              <Icon size={20} className={active ? 'text-primary' : 'text-muted-foreground'} />
              <span className={`text-[10px] ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
