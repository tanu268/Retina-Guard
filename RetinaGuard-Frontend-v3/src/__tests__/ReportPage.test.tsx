import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportPage from '../pages/shared/ReportPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { reportService } from '../services/api';

vi.mock('../services/api', () => ({
  reportService: { getJson: vi.fn(), generate: vi.fn(), pdfBlob: vi.fn() },
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
  <MemoryRouter initialEntries={['/report/con123']}>
    <Routes>
      <Route path="/report/:consultationId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('ReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays AI result, human reviewer result, model/version, and disclaimer', async () => {
    (reportService.getJson as any).mockReturnValue({
      reportNumber: 'RPT-123',
      generatedAt: '2026-01-01T10:00:00Z',
      schemaVersion: '1.0',
      caseNumber: 'CASE-123',
      qrToken: 'abc',
      siteId: 'SITE-1',
      status: 'final',
      patient: {
        name: 'Test Patient',
        patientCode: 'PAT-123',
      },
      result: {
        gradeCode: 2,
        confidence: 0.9,
        referableProbability: 0.85,
        referable: true,
        qualityGrade: 'A',
        abstained: 0,
        modelVersion: 'v1.0',
        modelHash: 'abc',
      },
      review: {
        gradeCode: 2,
        decision: 'refer',
        agreement: true,
        reviewerName: 'Dr. Smith',
        completedAt: '2026-01-01T11:00:00Z',
      },
      explainability: {
        lesion: { counts: { ma: 5 } }
      }
    });

    render(<ReportPage />, { wrapper });

    await waitFor(() => {
      // Disclaimer
      expect(screen.getByText(/Screening result — not a diagnosis/i)).toBeInTheDocument();
      // AI result
      expect(screen.getAllByText(/Moderate NPDR/i)[0]).toBeInTheDocument();
      expect(screen.getByText('90.0%')).toBeInTheDocument();
      // Reviewer result
      expect(screen.getByText('Refer')).toBeInTheDocument();
      expect(screen.getByText('Agreed')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      // Version
      expect(screen.getByText('v1.0')).toBeInTheDocument();
    });
  });

  it('safely renders abstention state in report', async () => {
    (reportService.getJson as any).mockReturnValue({
      reportNumber: 'RPT-123',
      generatedAt: '2026-01-01T10:00:00Z',
      schemaVersion: '1.0',
      caseNumber: 'CASE-123',
      qrToken: 'abc',
      siteId: 'SITE-1',
      status: 'provisional',
      patient: {
        name: 'Test Patient',
      },
      result: {
        gradeCode: null,
        confidence: null,
        referableProbability: null,
        referable: null,
        qualityGrade: 'C',
        abstained: 1,
        abstainReason: 'UNGRADEABLE_IMAGE',
        modelVersion: 'v1.0',
      },
      review: null
    });

    render(<ReportPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/No grade issued/i)).toBeInTheDocument();
      expect(screen.getByText(/Ungradeable image/i)).toBeInTheDocument();
      expect(screen.queryByText('Grade 0')).not.toBeInTheDocument();
      expect(screen.getByText(/Awaiting reviewer adjudication/i)).toBeInTheDocument();
    });
  });
});
