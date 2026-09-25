import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AiAnalysis from '../pages/technician/AiAnalysis';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { analysisService, consultationService, imageService } from '../services/api';

vi.mock('../services/api', () => ({
  analysisService: {
    run: vi.fn(),
    getExplainability: vi.fn(),
  },
  consultationService: {
    get: vi.fn(),
    update: vi.fn(),
  },
  imageService: {
    listByConsultation: vi.fn(),
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

vi.mock('../contexts/SyncContext', () => ({
  useSync: () => ({ triggerSync: vi.fn(), isSyncing: false }),
  SyncProvider: ({ children }: any) => <div>{children}</div>
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/analysis/con123']}>
    <Routes>
      <Route path="/analysis/:consultationId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('AiAnalysis Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (consultationService.get as any).mockReturnValue({
      id: 'con123',
      patient_id: 'pat1',
      status: 'capture_pending',
    });

    (imageService.listByConsultation as any).mockReturnValue([{
      id: 'img1',
      status: 'uploaded',
      quality_grade: 'A',
      laterality: 'left',
    }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseAnalysisResponse = {
    analysis: {
      id: 'analysis1',
      image_id: 'img1',
      consultation_id: 'con123',
      status: 'completed',
      model_version: 'v1.0',
      dr_grade_code: 2,
      dr_grade_label: 'Moderate NPDR',
      confidence: 0.9,
      referable: 1,
      referable_probability: 0.85,
      grade_probabilities: [0.1, 0.1, 0.6, 0.1, 0.1],
      abstained: 0,
      triage_priority: 'P1',
    },
    disclaimer: 'AI-assisted screening result',
    isDiagnosis: false,
    humanReviewRequired: true,
  };

  it('successful run triggers exactly ONE analysis request and displays result', async () => {
    (analysisService.run as any).mockResolvedValue(baseAnalysisResponse);
    (analysisService.getExplainability as any).mockResolvedValue(null);

    render(<AiAnalysis />, { wrapper });

    const runBtn = screen.getAllByRole('button', { name: /Run analysis/i })[0];
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(analysisService.run).toHaveBeenCalledTimes(1);
      expect(screen.getAllByText('Moderate NPDR').length).toBeGreaterThan(0);
    });
  });

  it('double trigger prevents concurrent network requests', async () => {
    let resolveRun: (value: any) => void;
    (analysisService.run as any).mockImplementation(() => {
      return new Promise((resolve) => {
        resolveRun = resolve;
      });
    });

    render(<AiAnalysis />, { wrapper });

    const runBtn = screen.getAllByRole('button', { name: /Run analysis/i })[0];
    fireEvent.click(runBtn);
    fireEvent.click(runBtn);

    expect(analysisService.run).toHaveBeenCalledTimes(1);
    
    resolveRun!(baseAnalysisResponse);
    await waitFor(() => {
      expect(screen.getAllByText('Moderate NPDR').length).toBeGreaterThan(0);
    });
  });

  it('timeout shows error and allows retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    (analysisService.run as any).mockImplementation(() => new Promise(() => {}));

    render(<AiAnalysis />, { wrapper });

    const runBtn = screen.getAllByRole('button', { name: /Run analysis/i })[0];
    fireEvent.click(runBtn);

    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(screen.getByText(/Analysis is taking longer than expected/i)).toBeInTheDocument();
    });

    (analysisService.run as any).mockResolvedValue(baseAnalysisResponse);
    
    const retryBtn = screen.getAllByRole('button', { name: /Run analysis/i })[0];
    fireEvent.click(retryBtn);
    
    await waitFor(() => {
      expect(analysisService.run).toHaveBeenCalledTimes(2);
      expect(screen.getAllByText('Moderate NPDR').length).toBeGreaterThan(0);
    });
  });

  it('abstention response renders safely without Grade 0', async () => {
    (analysisService.run as any).mockResolvedValue({
      analysis: {
        ...baseAnalysisResponse.analysis,
        status: 'abstained',
        dr_grade_code: null,
        dr_grade_label: null,
        confidence: null,
        referable: null,
        referable_probability: null,
        grade_probabilities: null,
        abstained: 1,
        abstain_reason: 'LOW_CONFIDENCE',
      },
      disclaimer: '...',
    });

    render(<AiAnalysis />, { wrapper });

    const runBtn = screen.getAllByRole('button', { name: /Run analysis/i })[0];
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/Model confidence fell below the abstention threshold/i)).toBeInTheDocument();
      expect(screen.queryByText(/No Apparent DR/i)).not.toBeInTheDocument();
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    });
  });

  it('malformed response results in safe error state', async () => {
    (analysisService.run as any).mockRejectedValue(new Error('Malformed response'));

    render(<AiAnalysis />, { wrapper });

    const runBtn = screen.getAllByRole('button', { name: /Run analysis/i })[0];
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/Malformed response/i)).toBeInTheDocument();
      expect(screen.queryByText('No Apparent DR')).not.toBeInTheDocument();
    });
  });
});
