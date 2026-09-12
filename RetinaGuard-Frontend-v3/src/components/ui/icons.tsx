/**
 * Icons. Hand-rolled rather than pulled from an icon package: the set is small,
 * it keeps the offline bundle lean, and the retina/eye marks are specific to
 * this product rather than generic glyphs.
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...rest}
    >
      {children}
    </svg>
  );
}

/** The product mark: an optic disc with radiating vessels. */
export function RetinaMark({ size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
      <circle cx="15.2" cy="10.4" r="2.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13.2 12.4c-2.2 1.1-3.4 2.6-4.6 5M14.6 13.1c-1 2-1.2 3.6-1.1 5.6M13.4 9.2C11.6 8 9.9 7.4 7.6 7.2M13.1 11.2c-2.4-.1-4 .4-5.9 1.5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8"
      />
      <circle cx="8.4" cy="14.2" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Base {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Base>
);
export const IconUserPlus = (p: IconProps) => (
  <Base {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></Base>
);
export const IconCamera = (p: IconProps) => (
  <Base {...p}><path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" /><circle cx="12" cy="13" r="3.5" /></Base>
);
export const IconBrain = (p: IconProps) => (
  <Base {...p}><path d="M12 5a3 3 0 0 0-3 3 2.5 2.5 0 0 0-2 4 2.5 2.5 0 0 0 1 4.5A2.5 2.5 0 0 0 12 19M12 5a3 3 0 0 1 3 3 2.5 2.5 0 0 1 2 4 2.5 2.5 0 0 1-1 4.5A2.5 2.5 0 0 1 12 19M12 5v14" /></Base>
);
export const IconSync = (p: IconProps) => (
  <Base {...p}><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.6-4.2M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.6 4.2" /><path d="M20 3v5h-5M4 21v-5h5" /></Base>
);
export const IconQueue = (p: IconProps) => (
  <Base {...p}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1.5" /><circle cx="3.5" cy="12" r="1.5" /><circle cx="3.5" cy="18" r="1.5" /></Base>
);
export const IconStethoscope = (p: IconProps) => (
  <Base {...p}><path d="M5 3v6a4 4 0 0 0 8 0V3" /><path d="M4 3h2M12 3h2" /><path d="M9 13v2a5 5 0 0 0 10 0v-1" /><circle cx="19" cy="10" r="2.5" /></Base>
);
export const IconChart = (p: IconProps) => (
  <Base {...p}><path d="M3 3v17a1 1 0 0 0 1 1h17" /><path d="M7 15l4-5 3 3 5-7" /></Base>
);
export const IconUsers = (p: IconProps) => (
  <Base {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Base>
);
export const IconGauge = (p: IconProps) => (
  <Base {...p}><path d="M12 14l4-4" /><path d="M20.6 17a9 9 0 1 0-17.2 0" /><circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" /></Base>
);
export const IconShield = (p: IconProps) => (
  <Base {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></Base>
);
export const IconFile = (p: IconProps) => (
  <Base {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></Base>
);
export const IconPatients = (p: IconProps) => (
  <Base {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /><circle cx="12" cy="15" r="2" /></Base>
);
export const IconCheck = (p: IconProps) => (<Base {...p}><path d="m5 12 5 5L20 7" /></Base>);
export const IconX = (p: IconProps) => (<Base {...p}><path d="M18 6 6 18M6 6l12 12" /></Base>);
export const IconAlert = (p: IconProps) => (
  <Base {...p}><path d="M10.3 3.2 1.8 17.5A2 2 0 0 0 3.5 20.5h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></Base>
);
export const IconInfo = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></Base>
);
export const IconClock = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Base>
);
export const IconArrowRight = (p: IconProps) => (<Base {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Base>);
export const IconArrowLeft = (p: IconProps) => (<Base {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Base>);
export const IconChevronDown = (p: IconProps) => (<Base {...p}><path d="m6 9 6 6 6-6" /></Base>);
export const IconChevronRight = (p: IconProps) => (<Base {...p}><path d="m9 18 6-6-6-6" /></Base>);
export const IconMenu = (p: IconProps) => (<Base {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Base>);
export const IconSearch = (p: IconProps) => (
  <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Base>
);
export const IconUpload = (p: IconProps) => (
  <Base {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 9l5-5 5 5M12 4v12" /></Base>
);
export const IconDownload = (p: IconProps) => (
  <Base {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 11l5 5 5-5M12 16V4" /></Base>
);
export const IconPrint = (p: IconProps) => (
  <Base {...p}><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 15h12v6H6z" /></Base>
);
export const IconLogout = (p: IconProps) => (
  <Base {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></Base>
);
export const IconWifi = (p: IconProps) => (
  <Base {...p}><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0" /><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" /></Base>
);
export const IconWifiOff = (p: IconProps) => (
  <Base {...p}><path d="M2 2l20 20" /><path d="M8.5 16a5 5 0 0 1 7 0" /><path d="M5 12.5a10 10 0 0 1 5-2.6M14 9.9a10 10 0 0 1 5 2.6" /><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" /></Base>
);
export const IconLayers = (p: IconProps) => (
  <Base {...p}><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></Base>
);
export const IconTarget = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /></Base>
);
export const IconZoomIn = (p: IconProps) => (
  <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></Base>
);
export const IconZoomOut = (p: IconProps) => (
  <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" /></Base>
);
export const IconRefresh = (p: IconProps) => (
  <Base {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></Base>
);
export const IconDatabase = (p: IconProps) => (
  <Base {...p}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></Base>
);
export const IconHistory = (p: IconProps) => (
  <Base {...p}><path d="M3 12a9 9 0 1 0 2.6-6.4" /><path d="M3 3v6h6" /><path d="M12 7v5l3 2" /></Base>
);
export const IconEye = (p: IconProps) => (
  <Base {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Base>
);
