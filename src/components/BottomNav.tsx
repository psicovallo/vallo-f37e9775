import { NavLink, useLocation } from 'react-router-dom';
import { Home, Bell, Shield, Flame, PenLine, Swords, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SHARE_MESSAGE = `Smetti di trascinarti nel fango della normalità. Ho trovato il codice per camminare a un palmo da terra mentre gli altri mormorano nell'ombra. Senti il brivido di chi ha finalmente indossato l'Armatura. Diventa il Dio della tua realtà: https://www.psicovallo.com`;

const tabs = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/question', label: 'Domanda', icon: Flame },
  { to: '/sfogo', label: 'Sfogo', icon: PenLine },
  { to: '/sos-conflitti', label: 'SOS DNA', icon: Swords },
  { to: '/reminders', label: 'Promemoria', icon: Bell },
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
