// Shared state across all Socket.IO connections
// This will be used to maintain consistent state across all users

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
  status: 'available' | 'running' | 'completed';
  timeLeft: number;
  mode: string;
  locked: boolean;
  userStudentId: string;
  userPhone: string;
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

export const getAppState = (): SharedAppState => appState;
export const setAppState = (newState: SharedAppState) => {
  appState = newState;
};
export const updateAppState = (updates: Partial<SharedAppState>) => {
  appState = { ...appState, ...updates };
};
