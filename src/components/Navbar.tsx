import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { AppSection, RolePersona } from '../types/ecogen';

interface NavbarProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  activePersona: RolePersona;
  unreadNotifications: number;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'planet', label: 'Planet Data' },
  { id: 'actions', label: 'Actions & Map' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'academy', label: 'Academy' },
];

const ROLE_LABELS: Record<RolePersona['role'], string> = {
  guest: 'Guest',
  user: 'User',
  volunteer: 'Volunteer',
  organization: 'Organization',
  admin: 'Admin',
};

export function Navbar({ activeSection, onNavigate, activePersona, unreadNotifications }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (section: AppSection) => {
    onNavigate(section);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F8F7F2]/95 backdrop-blur-md border-b border-[#DDE3DD]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-xl font-bold tracking-tight text-[#0F2E1E] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803D]"
        >
          ECOGEN
        </button>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 pb-1 transition-colors border-b-2 ${
                  isActive
                    ? 'text-[#0F2E1E] border-[#15803D]'
                    : 'text-[#4B5E53] border-transparent hover:text-[#0F2E1E] hover:border-[#A3E635]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('workspace')}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeSection === 'workspace'
                ? 'bg-[#A3E635] text-[#0F2E1E]'
                : 'bg-[#0F2E1E] text-[#F8F7F2] hover:bg-[#17422B]'
            }`}
          >
            {ROLE_LABELS[activePersona.role]} Workspace
            {unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg border border-[#DDE3DD] text-[#0F2E1E]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-[#DDE3DD] bg-[#F8F7F2] px-4 py-3 flex flex-col gap-2"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeSection === item.id
                  ? 'bg-[#0F2E1E] text-[#F8F7F2]'
                  : 'text-[#14231B] hover:bg-[#EAECE7]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
