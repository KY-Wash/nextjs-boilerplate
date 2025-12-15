import type { NextApiRequest, NextApiResponse } from 'next';
import { getAppState, updateAppState, loadPersistedState } from '@/lib/sharedState';

// Track machine start times for accurate timer calculation based on system clock
const machineStartTimes: Map<string, number> = new Map();
// Global server timer that runs continuously
let globalServerTimer: NodeJS.Timeout | null = null;
// Flag to ensure state is loaded only once
let stateLoaded = false;

function initializeGlobalTimer() {
  if (globalServerTimer) {
    return; // Already initialized
  }
  
  // Run a global timer every 1 second to decrement all running machines based on system time
  globalServerTimer = setInterval(() => {
    const state = getAppState();
    const now = Date.now();
    let stateChanged = false;
    
    state.machines.forEach((machine) => {
      const key = `${machine.type}-${machine.id}`;
      
      if (machine.status === 'running') {
        const startTime = machineStartTimes.get(key);
        if (startTime !== undefined) {
          // Calculate time elapsed in seconds based on system clock
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          const totalDurationSeconds = machine.originalDuration ? machine.originalDuration * 60 : machine.timeLeft;
          
          // Calculate remaining time based on system clock
          const newTimeLeft = Math.max(0, totalDurationSeconds - elapsedSeconds);
          
          if (newTimeLeft !== machine.timeLeft) {
            machine.timeLeft = newTimeLeft;
            stateChanged = true;
          }
          
          // If timer reached 0, transition to pending-collection
          if (machine.timeLeft === 0 && machine.status === 'running') {
            machine.status = 'pending-collection';
            stateChanged = true;
          }
        }
      }
    });
    
    if (stateChanged) {
      updateAppState(state);
    }
  }, 1000);
}

function startServerTimer(machineId: string, machineType: string, initialDuration: number) {
  const key = `${machineType}-${machineId}`;
  // Record the exact time when machine starts (system clock based)
  machineStartTimes.set(key, Date.now());
  
  // Initialize global timer if not already done
  initializeGlobalTimer();
}

function stopServerTimer(machineId: string, machineType: string) {
  const key = `${machineType}-${machineId}`;
  machineStartTimes.delete(key);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Load persisted state on first request
  if (!stateLoaded) {
    loadPersistedState();
    stateLoaded = true;
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Forwarded-Host, X-API-KEY, X-CSRF-TOKEN, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    return res.status(200).end();
  }

  try {
    const state = getAppState();

    if (req.method === 'GET') {
      // GET - Return current state
      res.status(200).json(state);
    } else if (req.method === 'POST') {
      // POST - Handle events (machine start, waitlist join, etc)
      const { event, data } = req.body;

      if (!event) {
        return res.status(400).json({ error: 'Missing event type' });
      }

      switch (event) {
        case 'machine-start': {
          const machine = state.machines.find(
            (m) => m.id === data.machineId && m.type === data.machineType
          );
          if (machine && machine.status === 'available') {
            const durationInSeconds = data.duration * 60;
            machine.status = 'running';
            machine.mode = data.mode;
            machine.timeLeft = durationInSeconds;
            machine.originalDuration = data.duration; // Store original duration for accurate timer
            machine.userStudentId = data.studentId;
            machine.userPhone = data.phoneNumber;
            
            // Calculate spending
            const spending = data.mode === 'Normal' ? 5 : data.mode === 'Extra Wash' ? 6 : 0;
            
            // Record in usage history immediately when machine starts
            const now = new Date();
            state.usageHistory.push({
              id: `${Date.now()}-${Math.random()}`,
              machineType: data.machineType,
              machineId: data.machineId,
              mode: data.mode,
              duration: data.duration,
              date: now.toLocaleDateString(),
              studentId: data.studentId,
              timestamp: now.getTime(),
              spending: spending,
              status: 'completed'
            });
            
            // Automatically remove user from both waitlists when they start a machine
            state.waitlists.washers = state.waitlists.washers.filter(
              (entry) => entry.studentId !== data.studentId
            );
            state.waitlists.dryers = state.waitlists.dryers.filter(
              (entry) => entry.studentId !== data.studentId
            );
            
            // Start server-side timer with duration info
            startServerTimer(String(data.machineId), data.machineType, data.duration);
          }
          break;
        }

        case 'machine-cancel': {
          const machine = state.machines.find(
            (m) => m.id === data.machineId && m.type === data.machineType
          );
          if (machine && machine.userStudentId === data.studentId) {
            // Stop server timer
            stopServerTimer(data.machineId, data.machineType);
            
            // Mark the usage history entry as cancelled and remove spending
            state.usageHistory = state.usageHistory.map((h) => {
              if (h.studentId === data.studentId && 
                  h.machineType === data.machineType && 
                  h.machineId === data.machineId &&
                  h.status === 'completed') {
                return {
                  ...h,
                  status: 'cancelled',
                  spending: 0
                };
              }
              return h;
            });
            
            machine.status = 'available';
            machine.timeLeft = 0;
            machine.mode = '';
            machine.userStudentId = '';
            machine.userPhone = '';
          }
          break;
        }

        case 'waitlist-join': {
          const waitlistKey = data.machineType === 'washer' ? 'washers' : 'dryers';
          if (!state.waitlists[waitlistKey].some((entry) => entry.studentId === data.studentId)) {
            state.waitlists[waitlistKey].push({
              studentId: data.studentId,
              phone: data.phoneNumber,
            });
          }
          break;
        }

        case 'waitlist-leave': {
          const waitlistKey = data.machineType === 'washer' ? 'washers' : 'dryers';
          state.waitlists[waitlistKey] = state.waitlists[waitlistKey].filter(
            (entry) => entry.studentId !== data.studentId
          );
          break;
        }

        case 'issue-report': {
          const now = new Date();
          state.reportedIssues.push({
            id: `${Date.now()}-${Math.random()}`,
            machineType: data.machineType,
            machineId: data.machineId,
            reportedBy: data.reportedBy,
            phone: data.phone,
            description: data.description,
            timestamp: now.getTime(),
            date: now.toLocaleDateString(),
            resolved: false,
          });
          break;
        }

        case 'issue-resolve': {
          const issue = state.reportedIssues.find((i) => i.id === data.issueId);
          if (issue) {
            issue.resolved = data.resolved;
          }
          break;
        }

        case 'issue-delete': {
          state.reportedIssues = state.reportedIssues.filter((i) => i.id !== data.issueId);
          break;
        }

        case 'machine-lock': {
          const machine = state.machines.find(
            (m) => m.id === data.machineId && m.type === data.machineType
          );
          if (machine) {
            machine.locked = data.locked;
          }
          break;
        }

        case 'timer-tick': {
          // Client-side timer tick - acknowledge but don't override server timer
          // Server timer is the source of truth
          const machine = state.machines.find(
            (m) => m.id === data.machineId && m.type === data.machineType
          );
          if (machine && machine.status === 'running') {
            // Only accept if it matches server state (within 1 second tolerance)
            if (Math.abs(machine.timeLeft - data.timeLeft) <= 1) {
              machine.timeLeft = Math.max(0, data.timeLeft);
            }
            
            // If timer reached 0, mark as pending-collection
            if (machine.timeLeft === 0) {
              machine.status = 'pending-collection';
              stopServerTimer(data.machineId, data.machineType);
            }
          }
          break;
        }

        case 'clothes-collected': {
          const machine = state.machines.find(
            (m) => m.id === data.machineId && m.type === data.machineType
          );
          if (machine && machine.userStudentId === data.studentId) {
            state.stats.totalWashes += 1;

            // Stop server timer
            stopServerTimer(data.machineId, data.machineType);
            
            // Free up the machine
            machine.status = 'available';
            machine.timeLeft = 0;
            machine.mode = '';
            machine.userStudentId = '';
            machine.userPhone = '';
          }
          break;
        }

        case 'admin-update-machine': {
          const machine = state.machines.find(
            (m) => m.id === data.machineId && m.type === data.machineType
          );
          if (machine) {
            machine.status = data.status;
            machine.locked = data.status === 'maintenance';
            // Stop any running timer if admin changes status
            if (data.status !== 'running') {
              stopServerTimer(data.machineId, data.machineType);
            }
          }
          break;
        }
      }

      updateAppState(state);
      res.status(200).json({ success: true, state });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
