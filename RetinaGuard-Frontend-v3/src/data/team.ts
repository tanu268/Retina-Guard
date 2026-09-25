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
  { id: 'm1', name: 'Yash Singh Thakur', role: 'Team Lead • Simulation & AI/ML', blurb: 'Simulink/SimEvents & Model Development', avatar: '/team/Yash Singh Thakur.jpeg', github: 'https://github.com/yashcsv', linkedin: 'https://linkedin.com/in/yavora-yash' },
  { id: 'm2', name: 'Tanu Namdeo', role: 'Full-Stack Development Lead', blurb: 'AI/ML Development', avatar: '/team/Tanu Namdeo.jpeg', github: 'https://github.com/tanu268', linkedin: 'https://www.linkedin.com/in/tanu-namdeo-b8286a2a1' },
  { id: 'm3', name: 'Nitin Chadar', role: 'Full-Stack Developer', blurb: 'Application Integration', avatar: '/team/Nitin Chadar.jpg', github: 'https://github.com/nitinchadar22-cmd', linkedin: 'https://linkedin.com/in/nitin-chadar-ggits' },
  { id: 'm4', name: 'Nikhil Somkuwar', role: 'Full-Stack Developer', blurb: 'Application Integration', avatar: '/team/Nikhil Somkuwar.jpeg', github: 'https://github.com/NikhilSomkuwar-07', linkedin: 'https://linkedin.com/in/nikhil-somkuwar-0b2948327' },
  { id: 'm5', name: 'Shrusti Shingada', role: 'Data & AI/ML Lead', blurb: 'Data Pipeline, Preprocessing & Model Development', avatar: '/team/Shrusti Shingada.jpeg', github: 'https://github.com/shrusti0247', linkedin: 'https://linkedin.com/in/shrusti-shingade' },
  { id: 'm6', name: 'Priyanka Pandey', role: 'UI/UX & Documentation Lead', blurb: 'Frontend Design & Project Documentation', avatar: '/team/Priyanka Pandey.jpeg', github: 'https://github.com/Priyankapandey281-tech', linkedin: 'https://linkedin.com/in/priyanka-pandey-1327b6408' },
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
