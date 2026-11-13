import { ShieldCheck, UserCheck } from 'lucide-react';
import type { RolePersona, UserRole } from '../types/ecogen';

interface RoleSelectorBarProps {
  personas: RolePersona[];
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  compact?: boolean;
}

const ROLE_ORDER: { role: UserRole; label: string; hint: string }[] = [
  { role: 'guest', label: 'Guest', hint: 'Explore public data & calculator' },
  { role: 'user', label: 'User', hint: 'Challenges, campaigns & reports' },
  { role: 'volunteer', label: 'Volunteer', hint: 'Launch & lead field actions' },
  { role: 'organization', label: 'Organization', hint: 'Host verified impact campaigns' },
  { role: 'admin', label: 'Admin', hint: 'Moderate, approve & audit all' },
];

export function RoleSelectorBar({
  personas,
  activeRole,
  onSelectRole,
  compact = false,
}: RoleSelectorBarProps) {
  const currentPersona = personas.find((p) => p.role === activeRole) ?? personas[0];

  return (
    <section
      aria-label="Instant role selector"
      className={`border border-[#DDE3DD] bg-white rounded-xl ${compact ? 'p-4' : 'p-6'}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#4B5E53]">
            {activeRole === 'admin' ? (
              <ShieldCheck className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
            ) : (
              <UserCheck className="w-4 h-4 text-[#15803D]" aria-hidden="true" />
            )}
            <span>Instant Role Access · No Password Wall</span>
          </div>
          <h3 className="text-lg font-semibold text-[#0F2E1E] mt-1">
            Active Persona: {currentPersona.name}{' '}
            <span className="text-sm font-normal text-[#4B5E53]">({currentPersona.title})</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#F1F3EE] p-1.5 rounded-lg">
          {ROLE_ORDER.map((item) => {
            const isSelected = activeRole === item.role;
            return (
              <button
                key={item.role}
                type="button"
                onClick={() => onSelectRole(item.role)}
                title={item.hint}
                aria-pressed={isSelected}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F2E1E] text-[#F8F7F2]'
                    : 'text-[#394B40] hover:bg-white hover:text-[#0F2E1E]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {!compact && (
        <div className="mt-4 pt-4 border-t border-[#EAECE7] flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-[#4B5E53]">
          {currentPersona.capabilities.map((cap) => (
            <span key={cap}>· {cap}</span>
          ))}
        </div>
      )}
    </section>
  );
}
