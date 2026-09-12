/**
 * Our Team — single source of truth for the landing page team section.
 *
 * Replace `name`, `role` and the profile links here when the real details are
 * ready; nothing else in the codebase needs to change. `avatar` accepts any
 * path under /public (e.g. '/team/asha.webp'). When it is null the card falls
 * back to a generated monogram, so the layout never breaks on a missing image.
 */

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  /** One short line. Optional — omit for the minimal layout. */
  blurb?: string;
  avatar?: string | null;
  github?: string;
  linkedin?: string;
}

export const TEAM: TeamMember[] = [
  { id: 'm1', name: 'Member 1', role: 'Role Placeholder', avatar: null, github: '#', linkedin: '#' },
  { id: 'm2', name: 'Member 2', role: 'Role Placeholder', avatar: null, github: '#', linkedin: '#' },
  { id: 'm3', name: 'Member 3', role: 'Role Placeholder', avatar: null, github: '#', linkedin: '#' },
  { id: 'm4', name: 'Member 4', role: 'Role Placeholder', avatar: null, github: '#', linkedin: '#' },
  { id: 'm5', name: 'Member 5', role: 'Role Placeholder', avatar: null, github: '#', linkedin: '#' },
  { id: 'm6', name: 'Member 6', role: 'Role Placeholder', avatar: null, github: '#', linkedin: '#' },
];

/** Initials for the monogram fallback. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
