/**
 * Centralized Branch Configuration
 * 
 * All branches are defined here and used across:
 * - WashStation (branch entry)
 * - Admin (branch management)
 * - Enrollment (staff registration)
 * 
 * Each branch has a max_staff setting to limit attendees per shift
 */

export interface Branch {
  id: string;
  name: string;
  code: string;
  location: string;
  isActive: boolean;
  maxStaff: number; // Max number of attendees per shift
}

// Default branches - sync with admin/branches
export const BRANCHES: Branch[] = [
  { id: 'academic-city', name: 'Academic City', code: 'ACD', location: 'Accra', isActive: true, maxStaff: 2 },
  { id: 'pentagon', name: 'Pentagon Hall', code: 'PNT', location: 'KNUST Campus', isActive: true, maxStaff: 2 },
  { id: 'brunei', name: 'Brunei Hostel', code: 'BRN', location: 'KNUST Campus', isActive: true, maxStaff: 2 },
  { id: 'unity', name: 'Unity Hall', code: 'UNT', location: 'KNUST Campus', isActive: false, maxStaff: 2 },
  { id: 'east-legon', name: 'East Legon', code: 'ELG', location: 'East Legon', isActive: true, maxStaff: 2 },
  { id: 'osu', name: 'Osu Oxford Street', code: 'OSU', location: 'Osu', isActive: true, maxStaff: 2 },
  { id: 'tema', name: 'Tema Community 1', code: 'TM1', location: 'Tema', isActive: true, maxStaff: 2 },
];

// Get active branches only
export const getActiveBranches = () => BRANCHES.filter(b => b.isActive);

// Get branch by code
export const getBranchByCode = (code: string) => BRANCHES.find(b => b.code.toUpperCase() === code.toUpperCase());

// Get branch by ID
export const getBranchById = (id: string) => BRANCHES.find(b => b.id === id);

