/**
 * Dummy profiles for UI preview only.
 * Replace with real API data once backend is fully wired up.
 *
 * Convention:
 *   id prefixed with 'dummy-pro-'   → top/verified section
 *   id prefixed with 'dummy-near-'  → nearby profiles section
 *   _isDummy: true                  → flag so the UI can treat them as preview-only
 */

export const DUMMY_PRO_ARTISANS = [
  {
    id: 'dummy-pro-1',
    name: 'Emeka Okafor',
    profilePhoto: null,
    skills: ['Electrician', 'Wiring'],
    badgeLevel: 'trusted',
    distanceKm: '1.2',
    stats: { averageRating: 4.9, completedJobs: 134, acceptanceRate: 98 },
    bio: 'Certified electrician with 10 years of residential and commercial experience across Lagos.',
    location: { state: 'Lagos' },
    _isDummy: true,
  },
  {
    id: 'dummy-pro-2',
    name: 'Bola Adewale',
    profilePhoto: null,
    skills: ['Plumber', 'Pipe Fitting'],
    badgeLevel: 'verified',
    distanceKm: '2.7',
    stats: { averageRating: 4.7, completedJobs: 89, acceptanceRate: 95 },
    bio: 'Expert plumber specialising in bathroom installations and leak repairs.',
    location: { state: 'Lagos' },
    _isDummy: true,
  },
  {
    id: 'dummy-pro-3',
    name: 'Chinaza Eze',
    profilePhoto: null,
    skills: ['Carpenter', 'Furniture Repair'],
    badgeLevel: 'verified',
    distanceKm: '0.9',
    stats: { averageRating: 4.8, completedJobs: 62, acceptanceRate: 97 },
    bio: 'Custom furniture maker and skilled carpenter based in Ikeja.',
    location: { state: 'Lagos' },
    _isDummy: true,
  },
  {
    id: 'dummy-pro-4',
    name: 'Aisha Musa',
    profilePhoto: null,
    skills: ['AC Technician', 'AC Maintenance'],
    badgeLevel: 'trusted',
    distanceKm: '3.4',
    stats: { averageRating: 4.9, completedJobs: 201, acceptanceRate: 99 },
    bio: 'Certified HVAC technician — installation, servicing, and gas refilling.',
    location: { state: 'Lagos' },
    _isDummy: true,
  },
];

export const DUMMY_NEARBY_ARTISANS = [
  {
    id: 'dummy-near-1',
    name: 'Taiwo Bankole',
    profilePhoto: null,
    skills: ['Painter', 'Interior Design'],
    badgeLevel: 'verified',
    distanceKm: '0.6',
    stats: { averageRating: 4.6, completedJobs: 43, acceptanceRate: 92 },
    location: { state: 'Lagos' },
    _isDummy: true,
  },
  {
    id: 'dummy-near-2',
    name: 'Kola Fasanya',
    profilePhoto: null,
    skills: ['Generator Repair', 'Electrician'],
    badgeLevel: 'verified',
    distanceKm: '1.5',
    stats: { averageRating: 4.5, completedJobs: 57, acceptanceRate: 90 },
    location: { state: 'Lagos' },
    _isDummy: true,
  },
  {
    id: 'dummy-near-3',
    name: 'Ngozi Obiora',
    profilePhoto: null,
    skills: ['Tiler', 'Mason'],
    badgeLevel: 'verified',
    distanceKm: '2.1',
    stats: { averageRating: 4.7, completedJobs: 38, acceptanceRate: 94 },
    location: { state: 'Lagos' },
    _isDummy: true,
  },
  {
    id: 'dummy-near-4',
    name: 'Usman Garba',
    profilePhoto: null,
    skills: ['Welder', 'Metal Fabrication'],
    badgeLevel: 'verified',
    distanceKm: '3.0',
    stats: { averageRating: 4.4, completedJobs: 29, acceptanceRate: 88 },
    location: { state: 'Lagos' },
    _isDummy: true,
  },
  {
    id: 'dummy-near-5',
    name: 'Funke Adesanya',
    profilePhoto: null,
    skills: ['Cleaner', 'House Cleaning'],
    badgeLevel: 'verified',
    distanceKm: '1.8',
    stats: { averageRating: 4.8, completedJobs: 76, acceptanceRate: 96 },
    location: { state: 'Lagos' },
    _isDummy: true,
  },
];
