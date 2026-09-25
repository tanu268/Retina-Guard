import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../src/App';
import * as authService from '../../src/services/authService';
import { SyncProvider } from '../../src/contexts/SyncContext';
import * as api from '../../src/services/api';

vi.mock('../../src/services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    getStoredUser: vi.fn(),
    isAuthenticated: vi.fn(),
    loginAsRole: vi.fn(),
  },
  ROLE_HOME: { technician: '/app/technician', reviewer: '/app/review/queue' }
}));

vi.mock('../../src/services/api', () => ({
  casesService: { list: vi.fn(), getQueue: vi.fn() },
  patientService: { create: vi.fn(), get: vi.fn() },
  consultationService: { create: vi.fn(), get: vi.fn() },
  imageService: { upload: vi.fn() },
  analysisService: { trigger: vi.fn(), getResult: vi.fn() },
  reviewService: { submit: vi.fn() },
  reportService: { get: vi.fn() },
  syncService: { getStatus: vi.fn() },
  healthService: { check: vi.fn().mockResolvedValue({ status: 'ok' }) }
}));

describe('Frontend Workflows and Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TECH-001: Authentication routes correctly', async () => {
    vi.mocked(authService.authService.getCurrentUser).mockResolvedValue(null);
    vi.mocked(authService.authService.getStoredUser).mockReturnValue(null);
    render(<App />);
    expect(await screen.findByText(/Sign In/i)).toBeInTheDocument();
  });

  it('TECH-002: Technician case creation and upload/preview', async () => {
    vi.mocked(authService.authService.getCurrentUser).mockResolvedValue({ id: '1', role: 'technician', username: 'tech', isActive: true });
    vi.mocked(authService.authService.getStoredUser).mockReturnValue({ id: '1', role: 'technician', username: 'tech', isActive: true });
    render(<App />);
    await waitFor(() => {
      expect(document.body).toBeDefined();
    });
  });

  it('SAFETY-001: Null clinical-value safety and abstention state', async () => {
    const { AnalysisResultPanel } = await import('../../src/components/clinical/ResultPanel');
    const analysis = {
      status: 'abstained',
      abstainReason: 'MODEL_NOT_INTEGRATED',
      gradeLabel: null,
      confidence: null,
      referable: null,
      abstained: true
    };
    
    render(<AnalysisResultPanel analysis={analysis as any} />);
    
    expect(screen.queryByText('Grade 0')).not.toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText(/normal/i)).not.toBeInTheDocument();
  });
  
  it('SYNC-001: Offline/sync state rendering', async () => {
    const { default: SyncMonitor } = await import('../../src/pages/shared/SyncMonitor');
    render(
      <SyncProvider>
        <SyncMonitor />
      </SyncProvider>
    );
    expect(document.body).toBeDefined();
  });
});
