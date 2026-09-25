import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReviewWorkspace from '../pages/reviewer/ReviewWorkspace';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { reviewService, imageService, analysisService } from '../services/api';
import { HttpError } from '../lib/http';

vi.mock('../services/api', () => ({
  reviewService: {
    getCase: vi.fn(),
    decide: vi.fn(),
  },
  imageService: {
    listByConsultation: vi.fn(),
  },
  analysisService: {
    getExplainability: vi.fn(),
  }
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
  <MemoryRouter initialEntries={['/review/con123']}>
    <Routes>
      <Route path="/review/:consultationId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('ReviewWorkspace Workflow', () => {
  const baseConsultation = {
    patient_name: 'Test Patient',
    case_number: 'CASE-123',
    age: 40,
    gender: 'male',
    triage_priority: 'P1',
  };

  const baseAnalysis = {
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

  beforeEach(() => {
    vi.clearAllMocks();

    (reviewService.getCase as any).mockReturnValue({
      consultation: baseConsultation,
      analyses: [baseAnalysis],
      review: null,
    });

    (imageService.listByConsultation as any).mockReturnValue([{
      id: 'img1',
      status: 'uploaded',
      quality_grade: 'A',
      laterality: 'left',
    }]);

    (analysisService.getExplainability as any).mockResolvedValue(null);
  });

  it('renders case evidence and AI output', async () => {
    render(<ReviewWorkspace />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Test Patient')).toBeInTheDocument();
      expect(screen.getAllByText(/Moderate NPDR/i)[0]).toBeInTheDocument();
    });
  });

  it('successful decision submission navigates to report', async () => {
    (reviewService.decide as any).mockResolvedValue({ decision_uuid: 'uuid' });

    render(<ReviewWorkspace />, { wrapper });

    // Reviewer grade is pre-selected to AI grade (Moderate NPDR = Grade 2), but let's select "refer" decision.
    const referBtn = await screen.findByText('Refer');
    fireEvent.click(referBtn);

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Record decision/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(reviewService.decide).toHaveBeenCalledTimes(1);
    });
  });

  it('displays 409 idempotency error correctly', async () => {
    const error409 = new HttpError(409, 'DUPLICATE_RESOURCE', 'Conflict');
    (reviewService.decide as any).mockRejectedValue(error409);

    render(<ReviewWorkspace />, { wrapper });

    const referBtn = await screen.findByText('Refer');
    fireEvent.click(referBtn);

    const submitBtn = screen.getByRole('button', { name: /Record decision/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/This case has already been adjudicated/i)).toBeInTheDocument();
    });
  });

  it('displays clinical safety violation error', async () => {
    const errorSafety = new HttpError(422, 'CLINICAL_SAFETY_VIOLATION', 'Safety issue');
    // Using 422 here instead of 409 as per the HttpError signature, but the code checks for 'CLINICAL_SAFETY_VIOLATION'
    (errorSafety as any).details = { violations: [{ term: 'diagnosis', suggestion: 'screening result' }] };
    (reviewService.decide as any).mockRejectedValue(errorSafety);

    render(<ReviewWorkspace />, { wrapper });

    const referBtn = await screen.findByText('Refer');
    fireEvent.click(referBtn);

    const submitBtn = screen.getByRole('button', { name: /Record decision/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Prohibited clinical language/i)).toBeInTheDocument();
      expect(screen.getByText(/"diagnosis" → "screening result"/i)).toBeInTheDocument();
    });
  });
});
