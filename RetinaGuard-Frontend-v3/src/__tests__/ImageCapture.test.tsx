import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ImageCapture from '../pages/technician/ImageCapture';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { consultationService, imageService, casesService } from '../services/api';
import { HttpError } from '../lib/http';

vi.mock('../services/api', () => ({
  consultationService: { get: vi.fn() },
  imageService: { listByConsultation: vi.fn() },
  casesService: { createCase: vi.fn() }
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
  <MemoryRouter initialEntries={['/capture/con123']}>
    <Routes>
      <Route path="/capture/:consultationId" element={children} />
    </Routes>
  </MemoryRouter>
);

describe('ImageCapture Workflow', () => {
  let createObjectURLMock: any;
  let revokeObjectURLMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    (consultationService.get as any).mockReturnValue({
      id: 'con123',
      patient_id: 'pat1',
    });
    
    (imageService.listByConsultation as any).mockReturnValue([]);
  });

  afterEach(() => {
    // cleanup
  });

  it('valid image triggers preview and network request', async () => {
    let resolveCreateCase: any;
    (casesService.createCase as any).mockImplementation(() => new Promise((resolve) => {
      resolveCreateCase = resolve;
    }));

    render(<ImageCapture />, { wrapper });
    
    await waitFor(() => expect(document.querySelectorAll('input[type="file"]').length).toBe(2));
    
    const fileInput = document.querySelectorAll('input[type="file"]')[0];
    const file = new File(['dummy content'], 'fundus.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    // While uploading, preview should be shown
    await waitFor(() => {
      const img = screen.getByAltText(/Fundus preview/i);
      expect(img).toHaveAttribute('src', 'blob:mock-url');
      expect(createObjectURLMock).toHaveBeenCalledWith(file);
      expect(casesService.createCase).toHaveBeenCalledTimes(1);
    });

    // Now resolve upload
    resolveCreateCase({
      status: 'quality_pass',
      quality: {
        qualityGrade: 'A',
        qualityScore: 0.9,
        gradeable: 1,
        reasons: [],
        metrics: { focusScore: 0.9, illuminationUniformity: 0.9, contrast: 0.9, fieldCoverage: 0.9 }
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Quality A')).toBeInTheDocument();
    });
  });

  it('invalid MIME type blocks request', async () => {
    render(<ImageCapture />, { wrapper });
    
    await waitFor(() => expect(document.querySelectorAll('input[type="file"]').length).toBe(2));
    const fileInput = document.querySelectorAll('input[type="file"]')[0];
    
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(casesService.createCase).not.toHaveBeenCalled();
      expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
    });
  });

  it('file > 25MB blocks request', async () => {
    render(<ImageCapture />, { wrapper });
    
    await waitFor(() => expect(document.querySelectorAll('input[type="file"]').length).toBe(2));
    const fileInput = document.querySelectorAll('input[type="file"]')[0];
    
    const file = new File(['dummy content'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 30 * 1024 * 1024 }); // 30MB
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(casesService.createCase).not.toHaveBeenCalled();
      expect(screen.getByText(/exceeds the 25 MB limit/i)).toBeInTheDocument();
    });
  });

  it('offline error is handled cleanly', async () => {
    const offlineErr = new HttpError(0, 'NETWORK_ERROR', 'Offline');
    (casesService.createCase as any).mockRejectedValue(offlineErr);

    render(<ImageCapture />, { wrapper });
    
    await waitFor(() => expect(document.querySelectorAll('input[type="file"]').length).toBe(2));
    const fileInput = document.querySelectorAll('input[type="file"]')[0];
    
    const file = new File(['dummy content'], 'fundus.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); 
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/No connection to the edge server/i)).toBeInTheDocument();
    });
  });

  it('recapture revokes object URL', async () => {
    (casesService.createCase as any).mockResolvedValue({
      status: 'quality_pass',
      quality: {
        qualityGrade: 'B',
        qualityScore: 0.7,
        gradeable: 1,
        reasons: [],
        metrics: { focusScore: 0.7, illuminationUniformity: 0.7, contrast: 0.7, fieldCoverage: 0.7 }
      }
    });

    render(<ImageCapture />, { wrapper });
    
    await waitFor(() => expect(document.querySelectorAll('input[type="file"]').length).toBe(2));
    const fileInput = document.querySelectorAll('input[type="file"]')[0];
    const file = new File(['dummy'], 'fundus.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 }); 
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    const recaptureBtn = await screen.findByRole('button', { name: /Recapture/i });
    fireEvent.click(recaptureBtn);

    await waitFor(() => {
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
