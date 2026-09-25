import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CaseDetail from '../pages/shared/CaseDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  consultationService,
  imageService,
  patientService,
  auditService,
  reviewService,
  analysisService
} from '../services/api';

vi.mock('../services/api', () => ({
  consultationService: { get: vi.fn() },
  imageService: { listByConsultation: vi.fn() },
  patientService: { get: vi.fn() },
  auditService: { trail: vi.fn() },
  reviewService: { getCase: vi.fn() },
  analysisService: { getExplainability: vi.fn() },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasRole: vi.fn().mockReturnValue(true) }),
}));

vi.mock('../lib/query', () => ({
  useQuery: vi.fn((opts: any) => {
    return {
      data: opts.queryFn ? opts.queryFn() : null,
      isLoading: false,
      refetch: vi.fn()
    };
  })
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/case/con123']}>
    <Routes>
      <Route path="/case/:consultationId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('CaseDetail', () => {
  const baseConsultation = {
    id: 'con123',
    patient_id: 'pat123',
    case_number: 'CASE-123',
    status: 'awaiting_review',
    identity_confirmed: true,
    recapture_attempts: 0,
    created_at: '2026-01-01T10:00:00Z',
    sync_state: 'synced'
  };

  const basePatient = {
    id: 'pat123',
    patient_code: 'PAT-123',
    full_name: 'Test Patient',
    age: 40,
    gender: 'male',
    village: 'Test Village'
  };

  const baseImage = {
    id: 'img1',
    status: 'uploaded',
    quality_grade: 'A',
    laterality: 'left',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (consultationService.get as any).mockReturnValue(baseConsultation);
    (patientService.get as any).mockReturnValue(basePatient);
    (imageService.listByConsultation as any).mockReturnValue([baseImage]);
    (auditService.trail as any).mockReturnValue([]);
    (analysisService.getExplainability as any).mockResolvedValue(null);
  });

  it('safely displays case_uuid, identity, quality, analysis status, and review state', async () => {
    const analysis = {
      id: 'ana1',
      dr_grade_code: 2,
      dr_grade_label: 'Moderate NPDR',
      confidence: 0.9,
      referable_probability: 0.85,
      grade_probabilities: [0.1, 0.1, 0.6, 0.1, 0.1],
      model_version: 'v1.0',
      model_hash: 'abc',
      abstained: 0,
      status: 'completed',
    };

    (reviewService.getCase as any).mockResolvedValue({
      consultation: baseConsultation,
      analyses: [analysis],
      review: null,
    });

    render(<CaseDetail />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Test Patient')).toBeInTheDocument();
      expect(screen.getAllByText(/Moderate NPDR/i)[0]).toBeInTheDocument();

      
      expect(screen.getAllByText(/Quality A/i)[0]).toBeInTheDocument(); // Quality
      expect(screen.getAllByText('Awaiting review')[0]).toBeInTheDocument(); // Status
      expect(screen.getByText('90.0%')).toBeInTheDocument(); // 0.9 confidence
    });
  });

  it('safely handles abstention', async () => {
    const analysis = {
      id: 'ana1',
      dr_grade_code: null,
      dr_grade_label: null,
      confidence: null,
      referable_probability: null,
      grade_probabilities: null,
      model_version: 'v1.0',
      abstained: 1,
      abstain_reason: 'LOW_CONFIDENCE',
      status: 'completed',
    };

    (reviewService.getCase as any).mockResolvedValue({
      consultation: baseConsultation,
      analyses: [analysis],
      review: null,
    });

    render(<CaseDetail />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Low confidence/i)).toBeInTheDocument();
      expect(screen.getByText(/No grade issued/i)).toBeInTheDocument();
      expect(screen.getByText(/No grade is published/i)).toBeInTheDocument();
      expect(screen.queryByText('Grade 0')).not.toBeInTheDocument();
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });
  });
});
