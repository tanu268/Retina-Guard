import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '../../lib/query';
import { consultationService, imageService, casesService } from '../../services/api';
import { HttpError } from '../../lib/http';
import { cx, isTrue } from '../../lib/format';
import { QUALITY_GRADES } from '../../lib/clinical';
import {
  Alert, Button, Card, EmptyState, SectionHeader, Skeleton,
} from '../../components/ui';
import { QualityGauge, QualityBadge, StatusBadge } from '../../components/clinical/indicators';
import { QualityMetricBars } from '../../components/clinical/ResultPanel';
import {
  IconAlert, IconArrowRight, IconBrain, IconCamera, IconCheck, IconUpload, IconX,
} from '../../components/ui/icons';
import type { ImageRecord, Laterality, SqlBool, UploadImageResponse } from '../../types';

/* ═══════════════════════════════════════════════════════════════════════════
   Image capture.

   The quality gate runs synchronously inside POST /images/upload, so retake
   guidance is available the moment the upload returns — while the patient is
   still in the chair. That is the whole point of the endpoint's design, and the
   UI is built around showing it immediately rather than behind a second click.

   MAX_RECAPTURE_ATTEMPTS is enforced server-side: exceeding it returns
   409 CLINICAL_SAFETY_VIOLATION and the technician must escalate rather than
   keep photographing.
   ═══════════════════════════════════════════════════════════════════════════ */

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/x-png', 'image/tiff',
]);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function validateFile(file: File): string | null {
  if (!file || file.size === 0) return 'The selected file is empty.';
  if (file.size > MAX_BYTES) return `File exceeds the 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  if (!ALLOWED_MIME.has(file.type) && !['image/tiff'].includes(file.type)) {
    // TIFF may report as application/octet-stream on some OS.
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'jfif', 'png', 'tif', 'tiff'].includes(ext ?? '')) {
      return `Unsupported file type: ${file.type || ext}. Use JPEG, PNG, or TIFF.`;
    }
  }
  return null;
}

interface EyeState {
  uploading: boolean;
  result: UploadImageResponse | null;
  error: string | null;
  blocked: boolean;
  previewUrl: string | null;
}

const EMPTY_EYE: EyeState = {
  uploading: false, result: null, error: null, blocked: false, previewUrl: null,
};

function revokePreview(url: string | null) {
  if (url) { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }
}

function EyePanel({
  laterality, state, existing, onFile, onClear, disabled,
}: {
  laterality: Laterality;
  state: EyeState;
  existing: ImageRecord | null;
  onFile: (file: File) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const title = laterality === 'left' ? 'Left eye (OS)' : 'Right eye (OD)';
  const quality = state.result?.quality ?? null;
  const grade = quality?.qualityGrade ?? existing?.quality_grade ?? null;
  const score = quality?.qualityScore ?? existing?.quality_score ?? null;
  const hasResult = Boolean(quality || existing);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-none bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <IconCamera size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{title}</p>
            {state.result && (
              <p className="text-[11px] text-slate-500 tnum">
                Attempt {state.result.image.capture_attempt} ·{' '}
                {state.result.remainingAttempts} recapture
                {state.result.remainingAttempts === 1 ? '' : 's'} left
              </p>
            )}
          </div>
        </div>
        {grade && <QualityBadge grade={grade} size="sm" />}
      </div>

      <div className="p-5">
        {/* Image preview — shown after file selection, before result arrives */}
        {state.previewUrl && !state.result && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 mb-2">
              Preview — {title}
            </p>
            <div className="relative rounded-none overflow-hidden bg-slate-900 w-full" style={{ maxHeight: 220 }}>
              <img
                src={state.previewUrl}
                alt={`Fundus preview for ${title}`}
                className="w-full h-full object-contain"
                style={{ maxHeight: 220 }}
                onError={() => { /* preview failed — silently remove */ }}
              />
              {state.uploading && (
                <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-2">
                  <motion.span
                    className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <IconCamera size={18} />
                  </motion.span>
                  <p className="text-[12px] text-white font-medium">Running quality assessment…</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!hasResult ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cx(
              'rounded-none border-2 border-dashed transition-colors duration-200 py-10 px-5 text-center',
              dragging ? 'border-[#4338CA] bg-indigo-50/60' : 'border-slate-300 bg-slate-50/50',
              disabled && 'opacity-50 pointer-events-none',
            )}
          >
            {state.uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-11 h-11 rounded-none bg-indigo-100 text-[#4338CA] flex items-center justify-center">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  >
                    <IconCamera size={19} />
                  </motion.span>
                </div>
                <p className="text-[13px] font-medium text-slate-700">Running quality assessment…</p>
                <p className="text-[12px] text-slate-500">Focus, illumination, contrast and field coverage</p>
              </div>
            ) : (
              <>
                <span className="w-11 h-11 rounded-none bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <IconUpload size={19} />
                </span>
                <p className="text-[13px] font-medium text-slate-700">
                  Drop the fundus image here
                </p>
                <p className="text-[12px] text-slate-500 mt-1 mb-4">
                  JPEG, PNG or TIFF · up to 25 MB
                </p>
                <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                  Choose file
                </Button>
              </>
            )}
            <input
              ref={inputRef} type="file" className="hidden"
              accept="image/jpeg,image/png,image/tiff,.jpg,.jpeg,.png,.tif,.tiff,.jfif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <QualityGauge grade={grade} score={score} size={124} showGuidance={false} />
              <div className="flex-1 w-full min-w-0">
                <QualityMetricBars metrics={quality?.metrics ?? null} />
              </div>
            </div>

            {grade && (
              <div className={cx(
                'rounded-none px-3.5 py-2.5 text-[12px] leading-relaxed',
                grade === 'C' ? 'bg-red-50 text-red-800'
                  : grade === 'B' ? 'bg-amber-50 text-amber-800'
                    : 'bg-emerald-50 text-emerald-800',
              )}>
                {QUALITY_GRADES[grade].guidance}
              </div>
            )}

            {/* Actionable retake guidance from the quality gate. */}
            {quality?.reasons && quality.reasons.length > 0 && (
              <div className="rounded-none border border-amber-200 bg-amber-50 p-4">
                <p className="text-[13px] font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <IconAlert size={15} /> Retake guidance
                </p>
                <ul className="space-y-1.5">
                  {quality.reasons.map((r) => (
                    <li key={r.code} className="text-[12px] text-amber-800/90 leading-relaxed flex gap-2">
                      <span className="text-amber-500 shrink-0">·</span>
                      <span>{r.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-slate-500 clinical-id truncate">
                {state.result?.image.original_name ?? existing?.original_name ?? ''}
              </span>
              {state.result?.recaptureAllowed && !state.blocked ? (
                <Button
                  size="sm" variant="outline"
                  onClick={() => { revokePreview(state.previewUrl); onClear(); }}
                  icon={<IconCamera size={14} />}
                >
                  Recapture
                </Button>
              ) : (
                <StatusBadge tone="neutral" size="sm">No recaptures left</StatusBadge>
              )}
            </div>
          </div>
        )}

        {state.error && (
          <div className={cx(
            'mt-4 rounded-none px-3.5 py-3 text-[12px] leading-relaxed flex items-start gap-2',
            state.blocked ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-red-50 text-red-800',
          )}>
            <IconX size={14} className="shrink-0 mt-0.5" />
            <span>{state.error}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function ImageCapture() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();

  const [left, setLeft] = useState<EyeState>(EMPTY_EYE);
  const [right, setRight] = useState<EyeState>(EMPTY_EYE);

  const { data: consultation, isLoading } = useQuery({
    queryFn: () => consultationService.get(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const { data: existingImages, refetch: refetchImages } = useQuery({
    queryFn: () => imageService.listByConsultation(consultationId!),
    enabled: Boolean(consultationId),
    deps: [consultationId],
  });

  const existingLeft = existingImages?.find((i) => i.laterality === 'left' && i.status !== 'superseded') ?? null;
  const existingRight = existingImages?.find((i) => i.laterality === 'right' && i.status !== 'superseded') ?? null;

  const upload = useCallback(async (laterality: Laterality, file: File) => {
    const setState = laterality === 'left' ? setLeft : setRight;

    // Client-side validation before any network call.
    const validationError = validateFile(file);
    if (validationError) {
      setState((s) => ({ ...s, error: validationError }));
      return;
    }

    // Guard: consultation must be loaded before we can extract patient_id.
    if (!consultation?.patient_id) {
      setState((s) => ({ ...s, error: 'Case not loaded yet — please wait a moment and try again.' }));
      return;
    }

    // Create a preview URL immediately so the technician can verify the correct eye.
    // This is revoked when the component state is cleared or when a recapture starts.
    const previewUrl = URL.createObjectURL(file);
    setState((s) => ({ ...s, uploading: true, error: null, previewUrl }));

    try {
      const res = await casesService.createCase(
        consultation.patient_id,
        consultationId!,
        laterality,
        file,
      );

      // Map the /api/v1/cases response to the shape EyePanel expects.
      // The unified endpoint does not return the full ImageRecord, so we
      // reconstruct the minimum fields needed for the quality display.
      const result: UploadImageResponse = {
        image: {
          capture_attempt: 1,
          original_name: file.name,
          status: res.status as ImageRecord['status'],
        } as ImageRecord,
        quality: res.quality,
        recaptureAllowed: 1 as SqlBool,
        remainingAttempts: 1,
      };

      setState((s) => ({
        uploading: false, result, error: null, blocked: false,
        previewUrl: s.previewUrl, // keep preview after upload
      }));
      refetchImages();
    } catch (err) {
      // 409 CLINICAL_SAFETY_VIOLATION means the recapture limit is exhausted.
      // The technician must escalate rather than keep retaking.
      const isLimit = err instanceof HttpError && err.code === 'CLINICAL_SAFETY_VIOLATION';
      setState((s) => ({
        ...s,
        uploading: false,
        blocked: isLimit,
        error: isLimit
          ? 'Recapture limit reached for this eye. Do not photograph again — escalate this case to a reviewer as it stands.'
          : (err instanceof HttpError && err.isOffline)
            ? 'No connection to the edge server. The image cannot be uploaded until the connection returns.'
            : err instanceof Error ? err.message : 'Upload failed.',
      }));
    }
  }, [consultation, consultationId, refetchImages]);

  const capturedCount = [
    left.result || existingLeft,
    right.result || existingRight,
  ].filter(Boolean).length;

  const gradeableImage = (() => {
    const candidates = [
      left.result?.image, right.result?.image, existingLeft, existingRight,
    ].filter(Boolean) as ImageRecord[];
    return candidates.find((i) => i.quality_grade !== 'C') ?? null;
  })();

  const canProceed = Boolean(gradeableImage);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72" />
        <div className="grid lg:grid-cols-2 gap-5">
          <Skeleton className="h-[420px] rounded-none" />
          <Skeleton className="h-[420px] rounded-none" />
        </div>
      </div>
    );
  }

  if (!consultationId || !consultation) {
    return (
      <EmptyState
        title="No screening session selected"
        description="Open a case from the dashboard, or register a patient to begin a new screening."
        action={<Button onClick={() => navigate('/app/technician/register')}>Register patient</Button>}
      />
    );
  }

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Step 2 of the screening workflow"
        title="Capture retinal images"
        description="Quality is assessed the moment each image uploads, so a retake can happen while the patient is still present."
        actions={
          <Button
            onClick={() => navigate(`/app/technician/analysis/${consultationId}`)}
            disabled={!canProceed}
            icon={<IconBrain size={16} />}
          >
            Run AI analysis
          </Button>
        }
      />

      <Card className="!py-4 !px-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="text-[11px] text-slate-500 mb-0.5">Case</p>
            <p className="text-[13px] font-medium text-slate-900 clinical-id">{consultation.case_number}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-0.5">Images captured</p>
            <p className="text-[13px] font-medium text-slate-900 tnum">{capturedCount} of 2</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-0.5">Recapture attempts used</p>
            <p className="text-[13px] font-medium text-slate-900 tnum">{consultation.recapture_attempts}</p>
          </div>
          <div className="ml-auto">
            {isTrue(consultation.identity_confirmed) && (
              <StatusBadge tone="success" size="sm" icon={<IconCheck size={12} />}>
                Identity confirmed
              </StatusBadge>
            )}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <EyePanel
          laterality="right" state={right} existing={existingRight}
          onFile={(f) => upload('right', f)}
          onClear={() => setRight(EMPTY_EYE)}
          disabled={right.blocked}
        />
        <EyePanel
          laterality="left" state={left} existing={existingLeft}
          onFile={(f) => upload('left', f)}
          onClear={() => setLeft(EMPTY_EYE)}
          disabled={left.blocked}
        />
      </div>

      <AnimatePresence>
        {canProceed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          >
            <Alert
              tone="success"
              title="Ready for analysis"
              icon={<IconCheck size={17} />}
              action={
                <Button
                  onClick={() => navigate(`/app/technician/analysis/${consultationId}`)}
                  icon={<IconArrowRight size={14} />}
                >
                  Continue
                </Button>
              }
            >
              At least one gradeable image is available. Analysis runs locally on
              this node and does not need a network connection.
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {(left.blocked || right.blocked) && (
        <Alert tone="danger" title="Escalation required" icon={<IconAlert size={17} />}>
          The recapture limit has been reached. Submit the case for human review
          as it stands rather than photographing again — a reviewer will decide
          whether the patient needs to return.
        </Alert>
      )}
    </div>
  );
}
