import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cx } from '../../lib/format';
import { Button } from '../../components/ui';
import { ChevronRight, Database, Stethoscope, LineChart, Eye, AlertTriangle } from 'lucide-react';
import clinicalEvidenceHero from '../../assets/clinical-evidence-hero-cyan.png';


function ClinicalEvidenceNav() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter]',
        'duration-[var(--duration-normal)] ease-[var(--ease-in-out-soft)]',
        scrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/10 text-white' : 'bg-[#1a1a1a] text-white border-b border-[#333]'
      )}
    >
      <nav className="flex h-[72px] w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="UVI home">
          <span className={cx(
            "font-bold tracking-tight transition-all duration-200",
            "text-xl md:text-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent"
          )}>
            Unified Vision Intelligence
          </span>
        </Link>

        {/* Middle text removed per requirements */}
        <div className="hidden md:block flex-1" />

        <div className="flex items-center gap-4">
          <Button size="sm" variant="outline" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </div>
      </nav>
    </header>
  );
}

export default function ClinicalEvidence() {
  return (
    <div className="relative min-h-screen bg-[#f8fafc] font-sans selection:bg-cyan-500/30">
      <ClinicalEvidenceNav />
      
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-[#040b16] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a192f] via-[#040b16] to-[#020617] pointer-events-none" />
        
        {/* Subtle glow behind the image */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 max-w-3xl h-64 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          
          <div className="mb-8 px-4 py-1.5 rounded-full border border-cyan-900/50 bg-cyan-950/30 backdrop-blur-sm">
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] text-cyan-400/80">
              CLINICAL DEVELOPMENT • DIABETIC RETINOPATHY • EXPLAINABLE AI
            </span>
          </div>

          <img 
            src={clinicalEvidenceHero} 
            alt="Clinical Evidence" 
            className="w-full max-w-2xl h-auto mb-10 object-contain drop-shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
          />
          
          <p className="text-lg md:text-xl font-light text-slate-300 text-center max-w-3xl leading-relaxed px-4">
            Building AI-assisted diabetic retinopathy screening with clinical perspective, transparency, and evidence in mind.
          </p>
        </div>
      </section>

      <main className="px-4 sm:px-6 lg:px-8 py-20 max-w-4xl mx-auto space-y-24">
        
        {/* ── 01 CLINICAL CONTEXT ──────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="text-sm font-bold tracking-widest text-cyan-700 uppercase">01</span>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              Clinical Context
            </h2>
          </div>
          <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed space-y-6">
            <p>
              Unified Vision Intelligence is being developed as a lightweight, clinician-assisted screening platform focused on diabetic retinopathy and explainable retinal image analysis.
            </p>
            <p>
              Diabetic retinopathy can progress without obvious symptoms, making timely retinal screening an important part of diabetes care. AI-assisted screening has the potential to support earlier identification of retinal abnormalities, particularly in settings where access to specialized eye-care resources may be limited.
            </p>
          </div>
        </section>

        {/* ── 02 CLINICAL PERSPECTIVE ──────────────────────────────────── */}
        <section>
          <div className="relative bg-white rounded-2xl p-8 md:p-12 border border-slate-200 shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-700" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold tracking-widest text-cyan-700 uppercase">02</span>
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                  Clinical Perspective
                </h2>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 tracking-wider">
                DEVELOPMENT INSIGHT
              </span>
            </div>
            
            <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
              <p>
                During the development of Unified Vision Intelligence, we had the opportunity to discuss the project and its proposed workflow with a medical professional.
              </p>
              <p>
                The discussion provided valuable clinical perspective on how an AI-assisted screening system should present its findings, how visual evidence can support interpretation, and how the technology can fit into a practical healthcare workflow.
              </p>
              <p>
                The feedback helped us reconsider several aspects of the platform, particularly around clarity, explainability, usability, and the role of clinical judgment in AI-assisted screening.
              </p>
              <div className="mt-8 p-4 bg-slate-50 border-l-4 border-slate-300 rounded-r-lg text-sm text-slate-500 font-medium italic">
                This interaction is part of our development process and should not be interpreted as clinical validation, certification, or medical approval of the system.
              </div>
            </div>
          </div>
        </section>

        {/* ── 03 EXPLAINABLE AI ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="text-sm font-bold tracking-widest text-cyan-700 uppercase">03</span>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              Explainable AI
            </h2>
          </div>
          <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed space-y-6">
            <p>
              A central goal of UVI is to make an AI-assisted prediction easier to understand.
            </p>
            <p>
              Rather than presenting a prediction as an isolated output, the platform is designed around the idea of accompanying model results with visual evidence from the retinal image.
            </p>
            <p>
              This approach is consistent with an important consideration in medical AI: clinicians need to understand not only what a system predicts, but also what evidence contributed to that prediction.
            </p>
          </div>
        </section>

        {/* ── 04 CLINICAL ASSISTANCE ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="text-sm font-bold tracking-widest text-cyan-700 uppercase">04</span>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              Designed for Clinical Assistance
            </h2>
          </div>
          <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed space-y-6">
            <p>
              UVI is intended as a clinical-assistance tool, not as a replacement for a qualified healthcare professional.
            </p>
            <p>
              The system is being designed to support screening by:
            </p>
            <ul className="space-y-3 list-none pl-0">
              <li className="flex items-start">
                <ChevronRight className="h-6 w-6 text-cyan-600 mr-2 shrink-0" />
                <span>assisting with retinal image assessment,</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="h-6 w-6 text-cyan-600 mr-2 shrink-0" />
                <span>highlighting relevant visual evidence,</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="h-6 w-6 text-cyan-600 mr-2 shrink-0" />
                <span>presenting AI-generated findings clearly,</span>
              </li>
              <li className="flex items-start">
                <ChevronRight className="h-6 w-6 text-cyan-600 mr-2 shrink-0" />
                <span>and helping clinicians review the information within their existing decision-making process.</span>
              </li>
            </ul>
            <p className="mt-8 font-medium text-slate-800">
              The final clinical interpretation and patient-management decision remain with the appropriate healthcare professional.
            </p>
          </div>
        </section>

        {/* ── 05 EVIDENCE & VALIDATION ─────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="text-sm font-bold tracking-widest text-cyan-700 uppercase">05</span>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              Evidence & Validation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cards */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Dataset</h3>
              </div>
              <p className="text-slate-600 flex-1">
                Number and source of retinal images used for development/testing.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Evaluation</h3>
              </div>
              <p className="text-slate-600 flex-1">
                How the model was evaluated and what reference standard was used.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <LineChart className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Performance</h3>
              </div>
              <p className="text-slate-600 flex-1">
                Metrics such as sensitivity, specificity, AUC, precision/recall, etc., with the relevant test population and confidence intervals.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Eye className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Explainability</h3>
              </div>
              <p className="text-slate-600 flex-1">
                Examples demonstrating whether highlighted regions correspond to clinically meaningful retinal findings.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm md:col-span-2 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Limitations</h3>
              </div>
              <p className="text-slate-600 flex-1">
                Known limitations such as image quality, dataset diversity, generalizability, and cases requiring clinician review.
              </p>
            </div>
          </div>
        </section>

        {/* ── 06 CONTINUING DEVELOPMENT ────────────────────────────────── */}
        <section className="pb-16">
          <div className="flex items-center gap-4 mb-8">
            <span className="text-sm font-bold tracking-widest text-cyan-700 uppercase">06</span>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
              Continuing Development
            </h2>
          </div>
          <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed space-y-6">
            <p>
              Clinical evidence is an ongoing process.
            </p>
            <p>
              As Unified Vision Intelligence develops, we aim to evaluate the system through increasingly structured testing, improve explainability, and incorporate relevant clinical feedback into the design.
            </p>
            <p>
              Our focus is not only on developing an AI model, but on building a screening workflow that is transparent, practical, and responsible.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}
