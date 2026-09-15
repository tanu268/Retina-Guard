import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consultationService, geoService, patientService } from '../../services/api';
import { HttpError } from '../../lib/http';
import { cx } from '../../lib/format';
import {
  Alert, Button, Card, Divider, Field, Input, SectionHeader, Select,
} from '../../components/ui';
import { IconAlert, IconArrowLeft, IconArrowRight, IconCheck, IconUserPlus } from '../../components/ui/icons';
import type { CreatePatientRequest, Patient } from '../../types';

/* ═══════════════════════════════════════════════════════════════════════════
   Four-step registration.

   The duplicate check is the reason this is not one long form. The backend
   returns `possibleDuplicates` from POST /patients — near matches on phone or
   name+age. The previous implementation discarded that array. Here the
   technician is shown the matches and must actively confirm identity before a
   consultation is created, because `identityConfirmed: true` is a clinical
   precondition the API enforces.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Duration and HbA1c are shown only for a confirmed diabetes history. */
const DIABETES_KNOWN = (f: { diabetesHistory: string }) => f.diabetesHistory === 'yes';

/** Accepts a pasted "+91 98765 43210" and reduces it to the stored form. */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

type StepId = 'personal' | 'diabetes' | 'contact' | 'identity';

const STEPS: Array<{ id: StepId; label: string; hint: string }> = [
  { id: 'personal', label: 'Personal details', hint: 'Who is being screened' },
  { id: 'diabetes', label: 'Diabetes history', hint: 'Duration and control' },
  { id: 'contact', label: 'Contact & village', hint: 'How to reach them' },
  { id: 'identity', label: 'Identity confirmation', hint: 'Confirm before screening' },
];

interface FormState {
  fullName: string;
  age: string;
  gender: string;
  diabetesHistory: string;
  diabetesType: string;
  diabetesDurationYears: string;
  hba1c: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  notes: string;
}

const INITIAL: FormState = {
  fullName: '', age: '', gender: '',
  diabetesHistory: '', diabetesType: '', diabetesDurationYears: '', hba1c: '',
  phone: '', village: '', district: '', state: '',
  notes: '',
};

export default function PatientRegistration() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [duplicates, setDuplicates] = useState<Patient[] | null>(null);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /**
   * Changing diabetes history clears the fields it hides. Without this, a
   * technician who entered an HbA1c, then corrected the history to "No",
   * would leave a stranded value in state — invisible in the form but still
   * sitting in the payload. The backend rejects that combination outright,
   * so the failure would surface as an unexplained validation error on a
   * field the technician can no longer see.
   */
  const setDiabetesHistory = (value: string) => {
    setForm((f) => (value === 'yes'
      ? { ...f, diabetesHistory: value }
      : { ...f, diabetesHistory: value, diabetesType: '', diabetesDurationYears: '', hba1c: '' }));
    setErrors((e) => ({
      ...e, diabetesHistory: undefined, diabetesDurationYears: undefined, hba1c: undefined,
    }));
  };

  /** Selecting a state invalidates any district chosen under the previous one. */
  const setState = (value: string) => {
    setForm((f) => ({ ...f, state: value, district: '' }));
    setErrors((e) => ({ ...e, state: undefined, district: undefined }));
  };

  useEffect(() => {
    let cancelled = false;
    geoService.states()
      .then((list) => { if (!cancelled) setStates(list); })
      .catch(() => { if (!cancelled) setGeoError('Could not load the state list. Check the connection to the edge server.'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!form.state) { setDistricts([]); return undefined; }
    let cancelled = false;
    geoService.districts(form.state)
      .then((list) => { if (!cancelled) setDistricts(list); })
      .catch(() => { if (!cancelled) setDistricts([]); });
    return () => { cancelled = true; };
  }, [form.state]);

  // A stable idempotency key per registration attempt: a double-tap on a slow
  // link replays the original response instead of creating a second patient.
  const idempotencyKey = useMemo(
    () => `patient-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    [],
  );

  const validateStep = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (step.id === 'personal') {
      if (!form.fullName.trim()) next.fullName = 'Enter the patient\'s full name.';
      if (form.age) {
        const age = Number(form.age);
        if (!Number.isFinite(age) || age < 0 || age > 120) next.age = 'Enter an age between 0 and 120.';
      }
    }

    if (step.id === 'diabetes') {
      if (!form.diabetesHistory) {
        next.diabetesHistory = 'Select yes, no, or unknown.';
      }
      // Duration and HbA1c are only rendered — and only validated — when the
      // patient has a known diabetes history. See DIABETES_KNOWN below.
      if (form.diabetesHistory === 'yes') {
        if (form.diabetesDurationYears) {
          const d = Number(form.diabetesDurationYears);
          if (!Number.isFinite(d) || d < 0 || d > 90) next.diabetesDurationYears = 'Enter a duration between 0 and 90 years.';
        }
        if (form.hba1c) {
          const h = Number(form.hba1c);
          if (!Number.isFinite(h) || h < 3 || h > 20) next.hba1c = 'HbA1c is usually between 3% and 20%.';
        }
      }
    }

    // Mirrors the backend rule in patients.schema.js exactly: ten digits,
    // first digit 6-9. The previous pattern accepted 6-15 characters including
    // punctuation, so "98765" passed here and was rejected (or worse, stored)
    // server-side.
    if (step.id === 'contact' && form.phone) {
      const digits = normalisePhone(form.phone);
      if (!/^[6-9]\d{9}$/.test(digits)) {
        next.phone = 'Enter a 10-digit Indian mobile number (no letters or symbols).';
      }
    }
    if (step.id === 'contact' && form.district && !form.state) {
      next.state = 'Select a state before a district.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = async () => {
    if (!validateStep()) return;

    // Leaving the contact step creates the patient, so the duplicate check runs
    // before the technician commits to a screening session.
    if (step.id === 'contact' && !createdPatient) {
      setBusy(true);
      setSubmitError(null);
      try {
        const res = await patientService.create({
          fullName: form.fullName.trim(),
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender || undefined,
          phone: form.phone ? normalisePhone(form.phone) : undefined,
          village: form.village.trim() || undefined,
          district: form.district || undefined,
          state: form.state || undefined,
          diabetesHistory: (form.diabetesHistory || undefined) as CreatePatientRequest['diabetesHistory'],
          // Hidden fields are never submitted. The backend rejects duration or
          // HbA1c alongside a 'no'/'unknown' history rather than silently
          // dropping them, so sending them would fail the request outright.
          diabetesType: DIABETES_KNOWN(form) ? (form.diabetesType || undefined) : undefined,
          diabetesDurationYears: DIABETES_KNOWN(form) && form.diabetesDurationYears
            ? Number(form.diabetesDurationYears) : undefined,
          hba1c: DIABETES_KNOWN(form) && form.hba1c ? Number(form.hba1c) : undefined,
        }, idempotencyKey);

        setCreatedPatient(res.patient);
        setDuplicates(res.possibleDuplicates ?? []);
        setStepIndex(3);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Could not register the patient.');
      } finally {
        setBusy(false);
      }
      return;
    }

    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const startScreening = async () => {
    if (!createdPatient || !identityConfirmed) return;
    setBusy(true);
    setSubmitError(null);
    try {
      // `patientId` — camelCase. The previous client sent `patient_id` and every
      // call returned 422, which broke the technician workflow entirely.
      const consultation = await consultationService.create({
        patientId: createdPatient.id,
        identityConfirmed: true,
        notes: form.notes.trim() || undefined,
      });
      navigate(`/app/technician/capture/${consultation.id}`);
    } catch (err) {
      const message = err instanceof HttpError && err.code === 'VALIDATION_ERROR'
        ? 'The screening session could not be created. Check the patient record and try again.'
        : err instanceof Error ? err.message : 'Could not start the screening session.';
      setSubmitError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-7 max-w-[860px]">
      <SectionHeader
        eyebrow="Step 1 of the screening workflow"
        title="Register patient"
        description="Create the patient record, then confirm identity before capture begins."
      />

      {/* Stepper */}
      <ol className="flex flex-col sm:flex-row gap-2 sm:gap-0">
        {STEPS.map((s, i) => {
          const complete = i < stepIndex;
          const current = i === stepIndex;
          return (
            <li key={s.id} className="flex-1 flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={cx(
                    'w-7 h-7 rounded-none flex items-center justify-center text-[12px] font-semibold shrink-0 transition-colors duration-200',
                    complete ? 'bg-[#4338CA] text-white'
                      : current ? 'bg-indigo-100 text-[#4338CA] ring-2 ring-[#4338CA]'
                        : 'bg-slate-100 text-slate-400',
                  )}
                >
                  {complete ? <IconCheck size={13} /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={cx('text-[12px] font-medium truncate', current ? 'text-slate-900' : 'text-slate-500')}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate hidden lg:block">{s.hint}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cx('hidden sm:block h-px flex-1 mx-3', complete ? 'bg-[#4338CA]' : 'bg-slate-200')} />
              )}
            </li>
          );
        })}
      </ol>

      {submitError && (
        <Alert tone="danger" title="Registration could not complete" icon={<IconAlert size={17} />}>
          {submitError}
        </Alert>
      )}

      <Card>
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {step.id === 'personal' && (
              <div className="space-y-5">
                <Field label="Full name" required error={errors.fullName}>
                  <Input
                    value={form.fullName}
                    onChange={(e) => set('fullName', e.target.value)}
                    placeholder="As stated by the patient"
                    autoFocus
                    invalid={Boolean(errors.fullName)}
                  />
                </Field>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Age" error={errors.age} hint="Years">
                    <Input
                      type="number" min={0} max={120} value={form.age}
                      onChange={(e) => set('age', e.target.value)}
                      invalid={Boolean(errors.age)}
                    />
                  </Field>
                  <Field label="Gender">
                    <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                      <option value="">Not stated</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="undisclosed">Undisclosed</option>
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {step.id === 'diabetes' && (
              <div className="space-y-5">
                <Field
                  label="Diabetes history"
                  required
                  error={errors.diabetesHistory}
                  hint="Select Unknown if the patient is unsure — it is a real answer, not a blank."
                >
                  <Select
                    value={form.diabetesHistory}
                    onChange={(e) => setDiabetesHistory(e.target.value)}
                    invalid={Boolean(errors.diabetesHistory)}
                  >
                    <option value="">Select…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </Select>
                </Field>

                {DIABETES_KNOWN(form) ? (
                  <>
                    <p className="-mt-1 text-[13px] text-slate-500">
                      Duration and HbA1c help a reviewer interpret a borderline result.
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Diabetes type">
                        <Select value={form.diabetesType} onChange={(e) => set('diabetesType', e.target.value)}>
                          <option value="">Not stated</option>
                          <option value="type1">Type 1</option>
                          <option value="type2">Type 2</option>
                          <option value="gestational">Gestational</option>
                        </Select>
                      </Field>
                      <Field label="Duration" hint="Years since diagnosis" error={errors.diabetesDurationYears}>
                        <Input
                          type="number" min={0} max={90} value={form.diabetesDurationYears}
                          onChange={(e) => set('diabetesDurationYears', e.target.value)}
                          invalid={Boolean(errors.diabetesDurationYears)}
                        />
                      </Field>
                    </div>
                    <Field label="HbA1c" hint="Percentage, if a recent reading is available" error={errors.hba1c}>
                      <Input
                        type="number" step="0.1" min={3} max={20} value={form.hba1c}
                        onChange={(e) => set('hba1c', e.target.value)}
                        className="max-w-[200px]"
                        invalid={Boolean(errors.hba1c)}
                      />
                    </Field>
                  </>
                ) : form.diabetesHistory ? (
                  <p className="border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3 text-[13px] text-[var(--color-ink-muted)]">
                    Duration and HbA1c do not apply when diabetes history is
                    {form.diabetesHistory === 'no' ? ' "No"' : ' "Unknown"'}. They are not recorded for this patient.
                  </p>
                ) : null}
              </div>
            )}

            {step.id === 'contact' && (
              <div className="space-y-5">
                <Field label="Phone number" error={errors.phone} hint="Used to match against existing records">
                  <Input
                    type="tel" value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="10-digit mobile"
                    invalid={Boolean(errors.phone)}
                  />
                </Field>
                {geoError && <Alert tone="warning" title="Location list unavailable">{geoError}</Alert>}

                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="State" error={errors.state}>
                    <Select
                      value={form.state}
                      onChange={(e) => setState(e.target.value)}
                      invalid={Boolean(errors.state)}
                      disabled={states.length === 0}
                    >
                      <option value="">Select state…</option>
                      {states.map((st) => <option key={st} value={st}>{st}</option>)}
                    </Select>
                  </Field>

                  <Field
                    label="District"
                    error={errors.district}
                    hint={!form.state ? 'Select a state first' : undefined}
                  >
                    <Select
                      value={form.district}
                      onChange={(e) => set('district', e.target.value)}
                      invalid={Boolean(errors.district)}
                      disabled={!form.state || districts.length === 0}
                    >
                      <option value="">Select district…</option>
                      {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </Select>
                  </Field>

                  {/* Village stays free text: India has ~640,000 villages and no
                      bundled list would stay current. See the migration notes. */}
                  <Field label="Village" hint="As the patient states it">
                    <Input value={form.village} onChange={(e) => set('village', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {step.id === 'identity' && createdPatient && (
              <div className="space-y-5">
                <div className="rounded-none bg-slate-50 border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-1">
                        Patient record created
                      </p>
                      <p className="text-[19px] font-semibold text-slate-900">{createdPatient.full_name}</p>
                      <p className="text-[13px] text-slate-500 clinical-id mt-0.5">
                        {createdPatient.patient_code}
                      </p>
                    </div>
                    <span className="w-9 h-9 rounded-none bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <IconCheck size={17} />
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                    <div>
                      <dt className="text-slate-500 text-[11px] mb-0.5">Age</dt>
                      <dd className="font-medium text-slate-900 tnum">{createdPatient.age ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px] mb-0.5">Gender</dt>
                      <dd className="font-medium text-slate-900 capitalize">{createdPatient.gender ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px] mb-0.5">Phone</dt>
                      <dd className="font-medium text-slate-900 tnum">{createdPatient.phone ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 text-[11px] mb-0.5">Village</dt>
                      <dd className="font-medium text-slate-900 truncate">{createdPatient.village ?? '—'}</dd>
                    </div>
                  </dl>
                </div>

                {/* The duplicate check the backend performs, surfaced. */}
                {duplicates && duplicates.length > 0 && (
                  <Alert
                    tone="warning"
                    title={`${duplicates.length} similar ${duplicates.length === 1 ? 'record' : 'records'} already on this node`}
                    icon={<IconAlert size={17} />}
                  >
                    <p className="mb-3">
                      Check this is not a repeat registration before screening.
                    </p>
                    <ul className="space-y-2">
                      {duplicates.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-3 rounded-none bg-white/70 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-slate-900 truncate">{d.full_name}</p>
                            <p className="text-[11px] text-slate-500 clinical-id">{d.patient_code}</p>
                          </div>
                          <div className="text-right shrink-0 text-[12px] text-slate-600">
                            <p className="tnum">{d.age ?? '—'} yrs</p>
                            <p className="tnum">{d.phone ?? 'no phone'}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {duplicates && duplicates.length === 0 && (
                  <Alert tone="success" title="No similar records found" icon={<IconCheck size={17} />}>
                    This appears to be a new patient on this node.
                  </Alert>
                )}

                <Divider />

                <label className="flex items-start gap-3 cursor-pointer rounded-none border border-slate-200 p-4 hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(e) => setIdentityConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#4338CA] shrink-0"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-slate-900">
                      I have confirmed this patient's identity
                    </span>
                    <span className="block text-[12px] text-slate-500 mt-1 leading-relaxed">
                      A screening session cannot be created without this confirmation.
                      Verifying identity prevents a result being attached to the wrong record.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <Divider className="!my-6" />

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => (stepIndex === 0 ? navigate('/app/technician') : setStepIndex((i) => i - 1))}
            disabled={busy || (stepIndex === 3 && Boolean(createdPatient))}
            icon={<IconArrowLeft size={15} />}
          >
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step.id === 'identity' ? (
            <Button
              onClick={startScreening}
              disabled={!identityConfirmed || !createdPatient}
              loading={busy}
              icon={!busy ? <IconArrowRight size={15} /> : undefined}
            >
              Start screening
            </Button>
          ) : (
            <Button
              onClick={goNext}
              loading={busy}
              icon={!busy ? <IconArrowRight size={15} /> : undefined}
            >
              {step.id === 'contact' ? 'Create record' : 'Continue'}
            </Button>
          )}
        </div>
      </Card>

      {stepIndex < 3 && (
        <p className="text-[12px] text-slate-400 flex items-center gap-2">
          <IconUserPlus size={13} />
          The patient record is created at the end of step 3, so duplicates can be
          checked before a screening session begins.
        </p>
      )}
    </div>
  );
}
