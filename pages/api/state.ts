import type { NextApiRequest, NextApiResponse } from 'next';
import { getAppState, updateAppState } from '@/lib/sharedState';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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
            machine.status = 'running';
            machine.mode = data.mode;
            machine.timeLeft = data.duration * 60;
            machine.userStudentId = data.studentId;
            machine.userPhone = data.phoneNumber;

            // Auto-remove from waitlist
            const waitlistKey = data.machineType === 'washer' ? 'washers' : 'dryers';
            state.waitlists[waitlistKey] = state.waitlists[waitlistKey].filter(
              (entry) => entry.studentId !== data.studentId
            );

            // Add to usage history
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
            });

            state.stats.totalWashes += 1;
            state.stats.totalMinutes += data.duration;
          }
          break;
        }

        case 'machine-cancel': {
          const machine = state.machines.find(
            (m) => m.id === data.machineId && m.type === data.machineType
          );
          if (machine && machine.userStudentId === data.studentId) {
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

        default:
          return res.status(400).json({ error: 'Unknown event type' });
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
