/**
 * Hero marquee — the ten-beat visual story of a screening, ordered so the
 * daylight clinical photographs and the dark network renders alternate.
 *
 * All assets are 900x1200 (3:4) WebP under /public/marquee. Alt text is real,
 * not decorative: the strip carries the product narrative, so a screen-reader
 * user should get the same story.
 */

export interface MarqueeImage {
  src: string;
  alt: string;
}

export const MARQUEE_IMAGES: MarqueeImage[] = [
  { src: '/marquee/01-patient-arrives.webp', alt: 'A health worker greets an elderly woman arriving for screening at a rural primary health centre.' },
  { src: '/marquee/02-network-reach.webp', alt: 'Aerial view of villages connected by data links to a central screening server.' },
  { src: '/marquee/03-registration.webp', alt: 'A technician registers a patient on a tablet during a clinic consultation.' },
  { src: '/marquee/04-phc-to-district.webp', alt: 'A primary health centre linked to a district hospital across the landscape.' },
  { src: '/marquee/05-retinal-capture.webp', alt: 'A technician captures a fundus image using a retinal camera while the patient rests at the chin support.' },
  { src: '/marquee/06-telemedicine-hub.webp', alt: 'A village screening room connected to a district review centre through a telemedicine network.' },
  { src: '/marquee/07-ai-heatmap-review.webp', alt: 'An ophthalmologist compares a fundus photograph with its explainable AI heatmap on a dual monitor workstation.' },
  { src: '/marquee/08-national-network.webp', alt: 'Screening sites across India connected as a single national network.' },
  { src: '/marquee/09-patient-consultation.webp', alt: 'A clinician explains a retinal scan to a patient using a tablet.' },
  { src: '/marquee/10-screening-camp.webp', alt: 'A rural screening camp with multiple technicians capturing and grading retinal images.' },
];
