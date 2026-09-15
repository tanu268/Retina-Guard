import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, BarChart3, Building2, CheckCircle2, ChevronRight, ClipboardList, Cpu, Database,
  Eye, FileText, Layers, ListChecks, MapPin, ScanEye,
  ShieldCheck, Stethoscope, UserCog, UserPlus, Users,
} from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { GlowCard } from '../../components/ui/spotlight-card';
import { LandingNav } from '../../components/landing/LandingNav';
import heroImage from '../../assets/hero.png';
import { TEAM, initialsOf } from '../../data/team';
import { cx } from '../../lib/format';

/* ═══════════════════════════════════════════════════════════════════════════
   Landing page.

   Structure is fixed: Hero -> Features -> How It Works -> Our Team -> CTA ->
   Footer. All copy is the supplied source of truth. The page defines no
   background of its own — GlobalBackground in App.tsx renders behind it.
   ═══════════════════════════════════════════════════════════════════════════ */

/* lucide-react no longer ships brand marks, so these two are inlined. */
function Github({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function Linkedin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

const reveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.25, 1, 0.5, 1] as const } },
};

const revealStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

function SectionHeader({
  label, title, lead, align = 'center',
}: { label: string; title: string; lead?: string; align?: 'center' | 'left' }) {
  return (
    <motion.div
      variants={reveal}
      className={cx('max-w-3xl', align === 'center' ? 'mx-auto text-center' : 'text-left')}
    >
      <p className="eyebrow">{label}</p>
      <h2 className="text-display-lg mt-4 text-[var(--color-ink)]">{title}</h2>
      {lead && (
        <p className="mt-5 text-lead-airy text-[var(--color-ink-muted-48)]">
          {lead}
        </p>
      )}
    </motion.div>
  );
}

const FEATURES = [
  {
    icon: Cpu,
    title: 'AI-Powered Detection',
    desc: 'Detect retinal abnormalities using an explainable deep learning pipeline.',
  },
  {
    icon: Layers,
    title: 'Explainable Results',
    desc: 'Heatmaps and lesion evidence help clinicians understand every prediction.',
  },
  {
    icon: MapPin,
    title: 'Rural Ready',
    desc: 'Designed for PHCs, CHCs, district hospitals, and mobile screening camps.',
  },
  {
    icon: Users,
    title: 'Three-Level Healthcare Workflow',
    desc: 'Technicians capture, ophthalmologists validate, and administrators monitor the entire screening network.',
  },
];

const WORKFLOW = [
  {
    role: 'Technician',
    icon: ScanEye,
    summary: 'Capture and prepare high-quality retinal screening cases.',
    steps: [
      { icon: UserPlus, name: 'Register Patient', desc: 'Create a secure patient record with validated demographic information.' },
      { icon: Eye, name: 'Capture Retina', desc: 'Acquire left and right eye fundus images using the retinal camera.' },
      { icon: CheckCircle2, name: 'Quality Check', desc: 'Verify image quality before AI processing.' },
      { icon: Cpu, name: 'AI Analysis', desc: 'Generate explainable predictions with lesion localization.' },
      { icon: ClipboardList, name: 'Submit for Review', desc: 'Forward prioritized cases to the ophthalmologist.' },
    ],
  },
  {
    role: 'Ophthalmologist',
    icon: Stethoscope,
    summary: 'Validate AI predictions through explainable clinical review.',
    steps: [
      { icon: ListChecks, name: 'Priority Queue', desc: 'Review cases based on clinical urgency.' },
      { icon: Layers, name: 'View Evidence', desc: 'Inspect retinal images, heatmaps, and lesion explanations.' },
      { icon: ShieldCheck, name: 'Approve or Override', desc: 'Confirm or modify the AI assessment.' },
      { icon: FileText, name: 'Generate Report', desc: 'Produce the final verified clinical screening report.' },
    ],
  },
  {
    role: 'Administrator',
    icon: UserCog,
    summary: 'Monitor and manage the complete healthcare screening ecosystem.',
    steps: [
      { icon: BarChart3, name: 'National Analytics', desc: 'Monitor screenings from village to national level.' },
      { icon: Building2, name: 'District Capacity', desc: 'Track workload, throughput, and screening performance.' },
      { icon: Users, name: 'User Management', desc: 'Create and manage Technician, Reviewer, and Admin accounts.' },
      { icon: Database, name: 'System Health', desc: 'Monitor storage, synchronization, and operational status.' },
    ],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const startScreening = () => navigate('/login');
  const learnMore = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen">
      <LandingNav onStartScreening={startScreening} />

      <main>
        {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
        <section
          id="home"
          className="relative flex min-h-[90vh] w-full flex-col justify-end overflow-hidden bg-black"
        >
          {/* Edge-to-edge Photography */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt="RetinaGuard Platform"
              className="h-full w-full object-cover object-center"
            />
            {/* Subtle overlay only to guarantee white text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"></div>
          </div>

          {/* Foreground Content */}
          <div className="relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-24 pt-32 sm:px-8 md:pb-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.62, ease: [0.25, 1, 0.5, 1] }}
              className="max-w-4xl"
            >
              <div className="mb-6 flex items-center gap-4">
                <span className="h-[2px] w-8 bg-white"></span>
                <p className="text-[14px] font-bold uppercase tracking-[1.5px] text-white">
                  AI-Powered Rural Healthcare
                </p>
              </div>

              <h1 className="mb-8 text-[40px] font-bold uppercase leading-[1.05] tracking-tight text-white sm:text-[48px] md:text-[56px] lg:text-[64px]">
                Explainable AI for Diabetic Retinopathy Screening in India
              </h1>

              <p className="mb-12 max-w-2xl text-[16px] font-light leading-[1.5] text-[#e6e6e6] md:text-[18px]">
                A lightweight, clinician-assisted platform designed to improve early detection across India's healthcare ecosystem. Every prediction is backed by transparent lesion evidence.
              </p>

              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={startScreening}
                  className="inline-flex h-[48px] items-center justify-center rounded-none bg-white px-8 text-[14px] font-bold uppercase tracking-[1.5px] text-black transition-colors hover:bg-[#e6e6e6]"
                >
                  Start Screening
                </button>
                <button
                  type="button"
                  onClick={learnMore}
                  className="inline-flex h-[48px] items-center justify-center rounded-none border border-white bg-transparent px-8 text-[14px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-white/10"
                >
                  Learn More
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 2. Features ─────────────────────────────────────────────────── */}
        <motion.section
          id="features"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={revealStagger}
          className="mx-auto w-full max-w-7xl px-5 py-[var(--space-section)] sm:px-8"
        >
          <SectionHeader
            label="Why RetinaGuard"
            title="Built for Real-World Rural Screening"
            lead="A lightweight, explainable, and clinician-assisted platform designed to improve early diabetic retinopathy detection across India's healthcare ecosystem."
          />

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                variants={reveal}
                className="h-full"
              >
                <GlowCard 
                  customSize 
                  glowColor="blue" 
                  className="h-full w-full p-8 border border-[var(--color-border)] bg-[var(--color-surface-sunken)]"
                >
                  <div className="group relative z-10 flex h-full flex-col">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-pearl)] text-[var(--color-ink)] transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out-quart)] group-hover:scale-110">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <h3 className="mt-7 text-body-strong font-semibold text-[var(--color-ink)]">
                      {title}
                    </h3>
                    <p className="mt-3 text-body text-[var(--color-ink-muted-48)]">
                      {desc}
                    </p>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── 3. How It Works ─────────────────────────────────────────────── */}
        <motion.section
          id="how-it-works"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={revealStagger}
          className="mx-auto w-full max-w-7xl px-5 py-[var(--space-section)] sm:px-8"
        >
          <SectionHeader
            label="Role-Based Workflow"
            title="Three Connected Roles. One Intelligent Screening System."
          />

          <div className="mt-16 flex flex-col gap-6">
            {WORKFLOW.map(({ role, icon: RoleIcon, summary, steps }, roleIndex) => (
              <motion.div key={role} variants={reveal}>
                <GlowCard customSize glowColor="blue" className="flex flex-col lg:flex-row bg-[var(--color-surface-pearl)] overflow-hidden w-full border border-[var(--color-border)]">
                  
                  {/* Left Column (25%) */}
                  <div className="flex flex-col justify-center border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] p-8 lg:w-1/4 lg:border-b-0 lg:border-r">
                    <span className="mb-6 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-white">
                      <RoleIcon className="h-6 w-6" strokeWidth={1.5} />
                    </span>
                    <div>
                      <p className="eyebrow">Level {roleIndex + 1}</p>
                      <h3 className="mt-1.5 text-display-md font-semibold tracking-tight text-[var(--color-ink)]">
                        {role}
                      </h3>
                      <p className="mt-4 text-body text-[var(--color-ink-muted-48)]">
                        {summary}
                      </p>
                    </div>
                  </div>

                  {/* Right Column (75%) */}
                  <div className="relative grid flex-1 grid-cols-1 gap-8 p-8 sm:grid-cols-3 lg:w-3/4">
                    {steps.slice(0, 3).map(({ icon: StepIcon, name, desc }, i) => (
                      <div key={name} className="group/step relative flex min-w-0 flex-col">
                        
                        {/* Connecting Divider for Desktop/Tablet */}
                        {i < 2 && (
                          <>
                            {/* Horizontal Line */}
                            <div className="absolute left-6 top-6 -z-10 hidden h-[1px] w-[calc(100%+2rem)] bg-[var(--color-hairline)] sm:block" />
                            {/* Chevron Icon (Desktop) */}
                            <div className="absolute left-[100%] top-6 z-10 ml-4 hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[var(--color-surface-pearl)] text-[var(--color-ink-muted-48)] sm:flex">
                              <ChevronRight className="h-4 w-4" />
                            </div>
                            {/* Mobile connector line */}
                            <div className="absolute bottom-[-2rem] left-6 h-8 w-[1px] bg-[var(--color-hairline)] sm:hidden" />
                          </>
                        )}
                        
                        <div className="flex h-full min-w-0 flex-col">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-canvas-parchment)] text-[var(--color-ink-muted-48)] transition-colors duration-[var(--duration-fast)] group-hover/step:bg-[var(--color-primary)] group-hover/step:text-white">
                            <StepIcon className="h-5 w-5" strokeWidth={1.5} />
                          </span>
                          <h4 className="mt-5 text-body-strong font-semibold text-[var(--color-ink)] transition-colors group-hover/step:text-[var(--color-primary)]">
                            {name}
                          </h4>
                          <p className="mt-2 text-caption text-[var(--color-ink-muted-48)]">
                            {desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── 4. Our Team ─────────────────────────────────────────────────── */}
        <motion.section
          id="team"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={revealStagger}
          className="mx-auto w-full max-w-7xl px-5 py-[var(--space-section)] sm:px-8"
        >
          <SectionHeader label="The Team" title="Built by Six Engineers" />

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <motion.div key={member.id} variants={reveal}>
                <GlowCard customSize glowColor="blue" className="h-full w-full bg-white border border-[var(--color-border)]">
                  <div className="flex flex-col items-start p-8">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt=""
                        width={96}
                        height={96}
                        loading="lazy"
                        className="h-24 w-24 rounded-full border border-[var(--color-hairline)] object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-[var(--color-canvas-parchment)] text-display-md font-semibold text-[var(--color-ink)]"
                      >
                        {initialsOf(member.name)}
                      </span>
                    )}

                    <h3 className="mt-6 text-body-strong font-semibold text-[var(--color-ink)]">
                      {member.name}
                    </h3>
                    <p className="mt-1 text-caption text-[var(--color-ink-muted-48)]">{member.role}</p>
                    {member.blurb && (
                      <p className="mt-3 text-caption leading-relaxed text-[var(--color-ink-muted-48)]">
                        {member.blurb}
                      </p>
                    )}

                    <div className="mt-6 flex items-center gap-2">
                      {member.github && (
                        <a
                          href={member.github}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={`${member.name} on GitHub`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-pearl)] text-[var(--color-ink)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-canvas-parchment)]"
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {member.linkedin && (
                        <a
                          href={member.linkedin}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={`${member.name} on LinkedIn`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-pearl)] text-[var(--color-ink)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--color-canvas-parchment)]"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── 5. Call to Action ───────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={revealStagger}
          className="mx-auto w-full max-w-7xl px-5 pb-[var(--space-section)] sm:px-8"
        >
          <motion.div
            variants={reveal}
            className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-navy-950)] px-8 py-20 text-center sm:px-16"
          >
            <div className="relative">
              <h2 className="text-display-lg mx-auto max-w-3xl text-white">
                Ready to Transform Rural Eye Care?
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lead-airy text-white/70">
                Bringing intelligent eye care to every village through explainable AI and
                clinician-assisted diabetic retinopathy screening.
              </p>
              <div className="mt-10 flex justify-center">
                <Button
                  size="lg"
                  variant="primary"
                  onClick={startScreening}
                  className="border-white bg-white !text-[var(--color-brand-900)] hover:border-[var(--color-brand-100)] hover:bg-[var(--color-brand-100)] active:bg-[var(--color-brand-200)]"
                >
                  Explore RetinaGuard
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>

      {/* ── 6. Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] bg-white/70 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center bg-[var(--color-primary)]">
                  <span className="font-display text-sm font-bold text-white">R</span>
                </span>
                <span className="font-display text-lg font-semibold tracking-tight text-[var(--color-brand-950)]">
                  RetinaGuard
                </span>
              </div>
              <p className="mt-3 font-body text-sm text-[var(--color-ink-muted)]">
                Explainable AI for Rural Diabetic Retinopathy Screening
              </p>
            </div>

            <div className="flex items-center gap-2 border border-[var(--color-border)] px-4 py-2.5">
              <Activity className="h-4 w-4 text-[var(--color-success)]" strokeWidth={1.75} />
              <span className="font-ui text-[13px] text-[var(--color-ink-muted)]">
                AI-assisted screening aid — every result requires human review
              </span>
            </div>
          </div>

          <p className="mt-12 border-t border-[var(--color-border)] pt-7 font-ui text-[13px] text-[var(--color-ink-subtle)]">
            © 2026 RetinaGuard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
