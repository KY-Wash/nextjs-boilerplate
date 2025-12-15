// Shared state across all Socket.IO connections
// This will be used to maintain consistent state across all users

import fs from 'fs';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), '.kyWash-state.json');

export interface SharedAppState {
  machines: Machine[];
  waitlists: {
    washers: WaitlistEntry[];
    dryers: WaitlistEntry[];
  };
  reportedIssues: ReportedIssue[];
  usageHistory: UsageHistory[];
  stats: {
    totalWashes: number;
    totalMinutes: number;
  };
}

export interface Machine {
  id: string;
  type: 'washer' | 'dryer';
  status: 'available' | 'running' | 'maintenance' | 'pending-collection';
  timeLeft: number;
  mode: string;
  locked: boolean;
  userStudentId: string;
  userPhone: string;
  originalDuration?: number;
}

export interface WaitlistEntry {
  studentId: string;
  phone: string;
}

export interface Mode {
  name: string;
  duration: number;
}

export interface ReportedIssue {
  id: string;
  machineType: string;
  machineId: string;
  reportedBy: string;
  phone: string;
  description: string;
  timestamp: number;
  date: string;
  resolved: boolean;
}

export interface UsageHistory {
  id: string;
  machineType: string;
  machineId: string;
  mode: string;
  duration: number;
  date: string;
  studentId: string;
  timestamp: number;
  spending?: number;
  status?: 'completed' | 'cancelled';
}

export interface User {
  studentId: string;
  phoneNumber: string;
}

// Initial state
export const createInitialState = (): SharedAppState => ({
  machines: [
    // Washers (6)
    ...[1, 2, 3, 4, 5, 6].map((id) => ({
      id: String(id),
      type: 'washer' as const,
      status: 'available' as const,
      timeLeft: 0,
      mode: '',
      locked: false,
      userStudentId: '',
      userPhone: '',
    })),
    // Dryers (6)
    ...[1, 2, 3, 4, 5, 6].map((id) => ({
      id: String(id),
      type: 'dryer' as const,
      status: 'available' as const,
      timeLeft: 0,
      mode: '',
      locked: false,
      userStudentId: '',
      userPhone: '',
    })),
  ],
  waitlists: {
    washers: [],
    dryers: [],
  },
  reportedIssues: [],
  usageHistory: [],
  stats: {
    totalWashes: 0,
    totalMinutes: 0,
  },
});

// Global state instance
let appState = createInitialState();

// Load persisted state on startup
export const loadPersistedState = (): void => {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      const persistedState = JSON.parse(data);
      appState = persistedState;
    }
  } catch (error) {
    console.error('Failed to load persisted state:', error);
  }
};

// Save state to file
export const persistState = (): void => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(appState, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to persist state:', error);
  }
};

export const getAppState = (): SharedAppState => appState;
export const setAppState = (newState: SharedAppState) => {
  appState = newState;
  persistState();
};
export const updateAppState = (updates: Partial<SharedAppState>) => {
  appState = { ...appState, ...updates };
  persistState();
};
