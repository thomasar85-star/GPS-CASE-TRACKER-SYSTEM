import { OfficerRole, CaseStatus, Officer } from '../types';

/**
 * Hash password securely using Web Crypto SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_gps_salt_2026");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous simple hash for mock validation fallback
 */
export function quickHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'gps_sec_' + Math.abs(hash).toString(16) + '_synth';
}

/**
 * Sanitize text to prevent XSS vulnerabilities before rendering or storage
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * List of known Ghana Police Service rank titles and abbreviations
 * used to detect and clean redundant prefixes from officer names.
 */
const GPS_RANK_PREFIXES: string[] = [
  'Assistant Commissioner of Police',
  'Assistant Superintendent of Police',
  'Deputy Commissioner of Police',
  'Deputy Superintendent of Police',
  'Chief Superintendent of Police',
  'Chief Superintendent',
  'Chief Inspector (CID)',
  'Chief Inspector',
  'Chief Supt.',
  'Chief Insp.',
  'Superintendent of Police',
  'Superintendent',
  'Supt.',
  'Inspector (CID)',
  'Inspector General of Police',
  'Inspector',
  'Insp.',
  'Detective Chief Inspector',
  'Detective Inspector',
  'Detective Sergeant',
  'Detective Corporal',
  'Detective Constable',
  'Det. Chief Insp.',
  'Det. Insp.',
  'Det. Sgt.',
  'Det. Cpl.',
  'Det. Const.',
  'Det.',
  'General Constable',
  'Lance Corporal',
  'Corporal',
  'Sergeant',
  'Constable',
  'L/Cpl.',
  'Cpl.',
  'Sgt.',
  'Const.',
  'ACP',
  'DCOP',
  'COP',
  'IGP',
  'ASP',
  'DSP',
  'C/Insp',
  'C/Supt',
  'D/Insp',
  'D/Sgt',
  'D/Cpl'
];

/**
 * Strips any leading rank title or rank abbreviation from an officer's name
 * to prevent duplicate rank labels like "Inspector Inspector Faustina Danquah".
 */
export function cleanOfficerName(name: string | undefined | null): string {
  if (!name) return '';
  let cleaned = name.trim();
  let changed = true;

  while (changed && cleaned.length > 0) {
    changed = false;
    for (const prefix of GPS_RANK_PREFIXES) {
      const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`^${escaped}\\.?\\s*`, 'i');
      if (regex.test(cleaned)) {
        cleaned = cleaned.replace(regex, '').trim();
        changed = true;
      }
    }
  }

  return cleaned || name.trim();
}

/**
 * Safely formats an officer's rank and name for clean UI presentation without duplicate ranks.
 * Example: formatOfficerDisplayName('Inspector', 'Inspector Faustina Danquah') => "Inspector Faustina Danquah"
 * Example: formatOfficerDisplayName('Chief Inspector', 'Emmanuel Ofori') => "Chief Inspector Emmanuel Ofori"
 */
export function formatOfficerDisplayName(rank?: string | null, name?: string | null): string {
  const cleanedName = cleanOfficerName(name);
  const cleanedRank = rank?.trim();

  if (!cleanedName && !cleanedRank) return 'Officer';
  if (!cleanedName) return cleanedRank || 'Officer';
  if (!cleanedRank) {
    // If no rank provided, check if the original name had a rank prefix and preserve single rank
    return name?.trim() || 'Officer';
  }

  return `${cleanedRank} ${cleanedName}`;
}

/**
 * Ghana Police Service Standard Rank Structures by Role
 */
export const GPS_SENIOR_OFFICER_RANKS = [
  'Assistant Superintendent of Police (ASP)',
  'Deputy Superintendent of Police (DSP)',
  'Superintendent of Police',
  'Chief Superintendent of Police',
  'Assistant Commissioner of Police (ACP)',
  'Deputy Commissioner of Police (DCOP)',
  'Commissioner of Police (COP)',
  'Inspector General of Police (IGP)'
];

/**
 * Checks if a given rank string corresponds to a Gazetted Senior Police Officer (SPO)
 * (Assistant Superintendent of Police [ASP] through Inspector General of Police [IGP]).
 */
export function isSeniorOfficerRank(rank?: string | null): boolean {
  if (!rank) return false;
  const r = rank.toLowerCase().trim();
  return (
    r.includes('superintendent') ||
    r.includes('commissioner') ||
    r.includes('asp') ||
    r.includes('dsp') ||
    r.includes('csupt') ||
    r.includes('c/supt') ||
    r.includes('acp') ||
    r.includes('dcop') ||
    r.includes('cop') ||
    r.includes('igp')
  );
}

/**
 * Checks if an officer has a Senior Officer role or Gazetted Senior Police Officer rank.
 */
export function isSeniorOfficer(officer?: Officer | null): boolean {
  if (!officer) return false;
  return officer.role === 'senior_officer' || isSeniorOfficerRank(officer.rank);
}

export const GPS_RANKS_BY_ROLE: Record<OfficerRole, string[]> = {
  counter_nco: [
    'General Constable',
    'Lance Corporal',
    'Corporal',
    'Sergeant'
  ],
  station_officer: [
    'Inspector',
    'Chief Inspector'
  ],
  investigator: [
    'Detective Constable',
    'Detective Corporal',
    'Detective Sergeant',
    'Detective Inspector',
    'Inspector (CID)',
    'Chief Inspector (CID)'
  ],
  senior_officer: [
    'Assistant Superintendent of Police (ASP)',
    'Deputy Superintendent of Police (DSP)',
    'Superintendent of Police',
    'Chief Superintendent of Police',
    'Assistant Commissioner of Police (ACP)',
    'Deputy Commissioner of Police (DCOP)',
    'Commissioner of Police (COP)',
    'Inspector General of Police (IGP)'
  ]
};

export const GPS_ROLE_DETAILS: Record<OfficerRole, { title: string; rankRange: string; duties: string; badgeColor: string }> = {
  counter_nco: {
    title: 'Counter NCO',
    rankRange: 'General Constable to Sergeant',
    duties: 'Charge Office counter duties, complainant reception, lodging initial complaints, and recording exhibits in the Counter Diary.',
    badgeColor: 'bg-amber-900/60 text-amber-200 border-amber-400/40'
  },
  station_officer: {
    title: 'Station Officer',
    rankRange: 'Inspector to Chief Inspector',
    duties: 'Supervises the Counter NCOs, reviews intake entries, assigns cases for CID investigation, and manages station operations.',
    badgeColor: 'bg-blue-900/60 text-blue-200 border-blue-400/40'
  },
  investigator: {
    title: 'CID Investigator',
    rankRange: 'Detective Corporal to Chief Inspector (CID)',
    duties: 'Investigates assigned dockets, records suspect caution statements, compiles forensic exhibits, and prepares court documents.',
    badgeColor: 'bg-indigo-900/60 text-indigo-200 border-indigo-400/40'
  },
  senior_officer: {
    title: 'Senior Officer / Commander',
    rankRange: 'ASP to Chief Superintendent / ACP',
    duties: 'District and divisional command oversight, supervisory directives on aging dockets, cross-station coordination, and final case dispositions.',
    badgeColor: 'bg-emerald-900/60 text-emerald-200 border-emerald-400/40'
  }
};

/**
 * Role-Based Access Control (RBAC) rules
 */
export const RBAC = {
  canLodgeComplaint(role: OfficerRole): boolean {
    // Counter NCOs are the primary officers who lodge complaints; Station Officers and Commanders also have authority
    return role === 'counter_nco' || role === 'station_officer' || role === 'senior_officer';
  },

  canSuperviseStation(role: OfficerRole): boolean {
    // Station Officers supervise Counter NCOs, Senior Officers supervise station commands
    return role === 'station_officer' || role === 'senior_officer';
  },

  canUpdateInvestigation(role: OfficerRole): boolean {
    return role === 'investigator' || role === 'senior_officer';
  },

  canEndorseAndDirect(role: OfficerRole): boolean {
    return role === 'station_officer' || role === 'senior_officer';
  },

  canSetFinalDisposition(role: OfficerRole): boolean {
    return role === 'investigator' || role === 'station_officer' || role === 'senior_officer';
  },

  canViewAllCrossStationMatches(role: OfficerRole): boolean {
    // Station officers, investigators, and senior officers can inspect cross-station matches
    return role === 'senior_officer' || role === 'investigator' || role === 'station_officer';
  },

  canAssignOfficer(role: OfficerRole): boolean {
    return role === 'station_officer' || role === 'senior_officer';
  },

  canAddEvidence(role: OfficerRole): boolean {
    return role === 'counter_nco' || role === 'station_officer' || role === 'investigator' || role === 'senior_officer';
  },

  canRecordCautionStatement(role: OfficerRole): boolean {
    return role === 'investigator' || role === 'senior_officer';
  }
};

/**
 * SVG Placeholder Image Generators for Safe Synthetic Demo Data
 */
export function getPlaceholderImage(
  type: 'complainant' | 'suspect' | 'evidence' | 'scene' | 'officer' | string,
  label: string = 'PERSON'
): string {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    complainant: { bg: '%230A2A66', text: '%23FFFFFF', icon: 'COMPLAINANT' },
    suspect: { bg: '%237F1D1D', text: '%23FEE2E2', icon: 'SUSPECT RECORD' },
    evidence: { bg: '%231E293B', text: '%23C9A227', icon: 'EXHIBIT ITEM' },
    scene: { bg: '%23334155', text: '%2394A3B8', icon: 'CRIME SCENE' },
    officer: { bg: '%230A2A66', text: '%23C9A227', icon: 'GPS OFFICER' }
  };

  const c = colors[type] || colors.complainant;
  const safeLabel = encodeURIComponent(label.toUpperCase().slice(0, 18));
  
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="${c.bg}"/><circle cx="150" cy="115" r="50" fill="%23FFFFFF" fill-opacity="0.15"/><path d="M70 230 C70 175, 230 175, 230 230 Z" fill="%23FFFFFF" fill-opacity="0.15"/><rect x="20" y="245" width="260" height="36" rx="6" fill="%23000000" fill-opacity="0.5"/><text x="150" y="268" fill="${c.text}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" text-anchor="middle" letter-spacing="1">${c.icon}: ${safeLabel}</text><text x="150" y="40" fill="${c.text}" font-family="Arial, sans-serif" font-size="10" font-weight="600" text-anchor="middle" fill-opacity="0.7">SYNTHETIC PLACEHOLDER</text></svg>`;
}
