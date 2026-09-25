
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  AnalysisResultPanel,
  ScreeningDisclaimer,
} from '../components/clinical/ResultPanel';
import { AbstentionNotice } from '../components/clinical/indicators';
import type { AnalysisResult } from '../types';

describe('AnalysisResultPanel', () => {
  const baseAnalysis: AnalysisResult = {
    id: '123',
    image_id: 'img123',
    consultation_id: 'con123',
    status: 'completed',
    model_version: 'v1.0',
    model_hash: 'hash',
    preprocessing_hash: 'phash',
    dr_grade_code: 2,
    dr_grade_label: 'Moderate NPDR',
    grade_probabilities: [0.05, 0.1, 0.6, 0.2, 0.05],
    confidence: 0.82,
    referable_probability: 0.85,
    referable: 1,
    abstained: 0,
    abstain_reason: null,
    triage_priority: 'P1',
    anatomy: null,
    lesions: null,
    stage_timings_ms: null,
    warnings: null,
    error_message: null,
    audit_sampled: 0,
    started_at: null,
    completed_at: null,
    sync_state: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders normal completed result correctly', () => {
    render(<AnalysisResultPanel analysis={baseAnalysis} />);
    // Moderate NPDR might be rendered in the title and in the distribution list
    expect(screen.getAllByText('Moderate NPDR').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/82/i).length).toBeGreaterThan(0); // Confidence
    expect(screen.getByText('85.0%')).toBeInTheDocument(); // Referable prob
    expect(screen.getByText('Yes — refer for examination')).toBeInTheDocument();
    
    // Check probabilities render
    expect(screen.getByText('60.0%')).toBeInTheDocument();
  });

  it('renders Grade 0 explicitly', () => {
    render(
      <AnalysisResultPanel
        analysis={{
          ...baseAnalysis,
          dr_grade_code: 0,
          dr_grade_label: 'No Apparent DR',
          confidence: 0.95,
          referable_probability: 0.01,
          referable: 0,
          grade_probabilities: [0.95, 0.02, 0.01, 0.01, 0.01],
        }}
      />
    );
    expect(screen.getAllByText('No Apparent DR').length).toBeGreaterThan(0);
    expect(screen.getByText('Not indicated by this screening')).toBeInTheDocument();
    expect(screen.getAllByText(/95/i).length).toBeGreaterThan(0);
  });

  it('renders Abstention correctly', () => {
    render(
      <AnalysisResultPanel
        analysis={{
          ...baseAnalysis,
          status: 'abstained',
          dr_grade_code: null,
          dr_grade_label: null,
          confidence: null,
          referable_probability: null,
          referable: null,
          grade_probabilities: null,
          abstained: 1,
          abstain_reason: 'LOW_CONFIDENCE',
        }}
      />
    );
    
    expect(screen.getByText(/No grade issued/i)).toBeInTheDocument();
    expect(screen.getByText(/Low confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/Model confidence fell below the abstention threshold/i)).toBeInTheDocument();
    expect(screen.queryByText('No Apparent DR')).not.toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText('Not indicated by this screening')).not.toBeInTheDocument();
  });
  
  it('does not crash with missing optional fields', () => {
    const { container } = render(
      <AnalysisResultPanel
        analysis={{
          ...baseAnalysis,
          anatomy: null,
          lesions: null,
          stage_timings_ms: null,
          warnings: null,
          grade_probabilities: null,
        }}
      />
    );
    expect(container).toBeInTheDocument();
    expect(screen.getAllByText('Moderate NPDR').length).toBeGreaterThan(0);
  });
});

describe('AbstentionNotice', () => {
  it('renders every reason safely', () => {
    const reasons = [
      'LOW_CONFIDENCE',
      'UNGRADEABLE_IMAGE',
      'EXPLANATION_DISAGREEMENT',
      'STAGE_FAILURE',
      'BORDERLINE_THRESHOLD',
    ] as const;

    reasons.forEach((reason) => {
      const { unmount } = render(<AbstentionNotice reason={reason} />);
      expect(screen.getByText(/No grade issued/i)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders fallback for null/unknown reason', () => {
    render(<AbstentionNotice reason={null} />);
    expect(screen.getByText(/automated screening abstained/i)).toBeInTheDocument();
  });
});

describe('ScreeningDisclaimer', () => {
  it('always renders the mandatory disclaimer', () => {
    render(<ScreeningDisclaimer />);
    expect(screen.getByText(/AI-assisted screening result/i)).toBeInTheDocument();
    expect(screen.getByText(/Human review required/i)).toBeInTheDocument();
  });
});
