'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Waves, Loader2, Clock, Users, AlertCircle, LogOut, Settings, ChevronDown, ChevronUp, Lock, Unlock, History, TrendingUp, X, Edit2, BarChart3, Trash2 } from 'lucide-react';

interface User {
  studentId: string;
  phoneNumber: string;
}

interface Machine {
  id: number;
  type: 'washer' | 'dryer';
  status: 'available' | 'running' | 'maintenance';
  timeLeft: number;
  mode: string | null;
  locked: boolean;
  userStudentId: string | null;
  userPhone: string | null;
}

interface WaitlistEntry {
  studentId: string;
  phone: string;
}

interface UsageHistory {
  id: number;
  machineType: string;
  machineId: number;
  mode: string;
  duration: number;
  date: string;
  studentId: string;
  timestamp: number;
}

interface ReportedIssue {
  id: number;
  machineType: string;
  machineId: number;
  reportedBy: string;
  phone: string;
  description: string;
  timestamp: number;
  date: string;
  resolved: boolean;
}

interface Mode {
  name: string;
  duration: number;
}

interface Waitlists {
  washers: WaitlistEntry[];
  dryers: WaitlistEntry[];
}

const KYWashSystem = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'admin' | 'history' | 'stats'>('main' as 'main' | 'admin' | 'history' | 'stats');
  const [showLogin, setShowLogin] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [studentId, setStudentId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  const [machines, setMachines] = useState<Machine[]>([
    { id: 1, type: 'washer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 2, type: 'washer', status: 'maintenance', timeLeft: 0, mode: null, locked: true, userStudentId: null, userPhone: null },
    { id: 3, type: 'washer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 4, type: 'washer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 5, type: 'washer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 6, type: 'washer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 1, type: 'dryer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 2, type: 'dryer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 3, type: 'dryer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 4, type: 'dryer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 5, type: 'dryer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null },
    { id: 6, type: 'dryer', status: 'available', timeLeft: 0, mode: null, locked: false, userStudentId: null, userPhone: null }
  ]);

  const [waitlists, setWaitlists] = useState<Waitlists>({ washers: [], dryers: [] });
  const [showWasherWaitlist, setShowWasherWaitlist] = useState<boolean>(false);
  const [showDryerWaitlist, setShowDryerWaitlist] = useState<boolean>(false);
  const [showReportIssue, setShowReportIssue] = useState<boolean>(false);
  const [issueDescription, setIssueDescription] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [showEditProfile, setShowEditProfile] = useState<boolean>(false);
  const [reportedIssues, setReportedIssues] = useState<ReportedIssue[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [expandedWasherWaitlist, setExpandedWasherWaitlist] = useState<boolean>(false);
  const [expandedDryerWaitlist, setExpandedDryerWaitlist] = useState<boolean>(false);

  const modes: Mode[] = [
    { name: 'Normal', duration: 30 },
    { name: 'Extra 5 min', duration: 35 },
    { name: 'Extra 10 min', duration: 40 },
    { name: 'Extra 15 min', duration: 45 }
  ];

  // Real-time sync with polling
  const socketRef = useRef<{ emit: (event: string, data: any) => Promise<void> } | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize real-time sync with polling
  useEffect(() => {
    const emit = async (event: string, data: any) => {
      try {
        const response = await fetch('/api/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ event, data }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.state) {
            const newState = result.state;
            
            // Update machines
            setMachines(
              newState.machines.map((m: any) => ({
                id: parseInt(m.id),
                type: m.type,
                status: m.status,
                timeLeft: m.timeLeft,
                mode: m.mode || null,
                locked: m.locked,
                userStudentId: m.userStudentId || null,
                userPhone: m.userPhone || null,
              }))
            );

            // Update waitlists
            if (newState.waitlists) {
              setWaitlists({
                washers: newState.waitlists.washers || [],
                dryers: newState.waitlists.dryers || [],
              });
            }

            // Update reported issues
            if (newState.reportedIssues) {
              setReportedIssues(
                newState.reportedIssues.map((issue: any) => ({
                  id: issue.id,
                  machineType: issue.machineType,
                  machineId: parseInt(issue.machineId),
                  reportedBy: issue.reportedBy,
                  phone: issue.phone,
                  description: issue.description,
                  timestamp: issue.timestamp,
                  date: issue.date,
                  resolved: issue.resolved,
                }))
              );
            }

            // Update usage history
            if (newState.usageHistory) {
              setUsageHistory(
                newState.usageHistory.map((record: any) => ({
                  id: record.id,
                  machineType: record.machineType,
                  machineId: parseInt(record.machineId),
                  mode: record.mode,
                  duration: record.duration,
                  date: record.date,
                  studentId: record.studentId,
                  timestamp: record.timestamp,
                }))
              );
            }
          }
        }
      } catch (error) {
        console.error(`Failed to emit ${event}:`, error);
      }
    };

    socketRef.current = { emit };
    setSocketConnected(true);

    // Start polling for state updates
    const fetchState = async () => {
      try {
        const response = await fetch('/api/state');
        if (response.ok) {
          const newState = await response.json();

          // Update machines
          setMachines(
            newState.machines.map((m: any) => ({
              id: parseInt(m.id),
              type: m.type,
              status: m.status,
              timeLeft: m.timeLeft,
              mode: m.mode || null,
              locked: m.locked,
              userStudentId: m.userStudentId || null,
              userPhone: m.userPhone || null,
            }))
          );

          // Update waitlists
          setWaitlists({
            washers: newState.waitlists.washers || [],
            dryers: newState.waitlists.dryers || [],
          });

          // Update reported issues
          setReportedIssues(
            newState.reportedIssues.map((issue: any) => ({
              id: issue.id,
              machineType: issue.machineType,
              machineId: parseInt(issue.machineId),
              reportedBy: issue.reportedBy,
              phone: issue.phone,
              description: issue.description,
              timestamp: issue.timestamp,
              date: issue.date,
              resolved: issue.resolved,
            }))
          );

          // Update usage history
          setUsageHistory(
            newState.usageHistory.map((record: any) => ({
              id: record.id,
              machineType: record.machineType,
              machineId: parseInt(record.machineId),
              mode: record.mode,
              duration: record.duration,
              date: record.date,
              studentId: record.studentId,
              timestamp: record.timestamp,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch state:', error);
      }
    };

    // Fetch initial state
    fetchState();

    // Poll every 1 second for real-time updates
    pollingIntervalRef.current = setInterval(fetchState, 1000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMachines((prev: Machine[]) => prev.map((machine: Machine) => {
        if (machine.status === 'running' && machine.timeLeft > 0) {
          const newTimeLeft = machine.timeLeft - 1;
          
          if (newTimeLeft === 0) {
            playNotificationSound();
            showNotification(`${machine.type.charAt(0).toUpperCase() + machine.type.slice(1)} ${machine.id} is now available!`);
            notifyWaitlist(machine.type);
            
            return { ...machine, status: 'available', timeLeft: 0, mode: null, userStudentId: null, userPhone: null };
          }
          
          return { ...machine, timeLeft: newTimeLeft };
        }
        return machine;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const playNotificationSound = (): void => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const showNotification = (message: string): void => {
    alert(message);
  };

  const notifyWaitlist = (type: string): void => {
    const listKey = type === 'washer' ? 'washers' : 'dryers';
    if (waitlists[listKey].length > 0) {
      const nextUser = waitlists[listKey][0];
      showNotification(`${nextUser.studentId}, a ${type} is available!`);
    }
  };

  const validateStudentId = (id: string): boolean => /^\d{6}$/.test(id);
  const validatePhone = (phone: string): boolean => /^\d{10,11}$/.test(phone);
  const validatePassword = (pass: string): boolean => /^\d{8}$/.test(pass);

  const handleLogin = (): void => {
    setError('');
    if (!validateStudentId(studentId)) {
      setError('Student ID must be 6 digits');
      return;
    }
    if (!validatePhone(phoneNumber)) {
      setError('Phone must be 10-11 digits');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be 8 digits');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setUser({ studentId, phoneNumber });
      setShowLogin(false);
      setCurrentView('main');
      setStudentId('');
      setPhoneNumber('');
      setPassword('');
      setLoading(false);
    }, 500);
  };

  const handleAdminLogin = (): void => {
    setError('');
    if (adminPassword === 'admin123') {
      setShowAdminLogin(false);
      setCurrentView('admin');
      setAdminPassword('');
      setShowLogin(false);
    } else {
      setError('Invalid admin password');
    }
  };

  const startMachine = (machineId: number, machineType: 'washer' | 'dryer', mode: Mode): void => {
    if (!user) return;

    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('machine-start', {
        machineId: String(machineId),
        machineType: machineType,
        mode: mode.name,
        duration: mode.duration,
        studentId: user.studentId,
        phoneNumber: user.phoneNumber,
      });
    }

    setMachines((prev: Machine[]) => prev.map((machine: Machine) => 
      machine.id === machineId && machine.type === machineType
        ? {
            ...machine,
            status: 'running',
            timeLeft: mode.duration * 60,
            mode: mode.name,
            userStudentId: user.studentId,
            userPhone: user.phoneNumber
          }
        : machine
    ));

    setUsageHistory((prev: UsageHistory[]) => [...prev, {
      id: Date.now(),
      machineType: machineType,
      machineId: machineId,
      mode: mode.name,
      duration: mode.duration,
      date: new Date().toLocaleDateString(),
      studentId: user.studentId,
      timestamp: Date.now(),
    }]);

    // Remove user from waitlist when starting a machine
    leaveWaitlist(machineType);

    showNotification(`${machineType.charAt(0).toUpperCase() + machineType.slice(1)} ${machineId} started!`);
  };

  const cancelMachine = (machineId: number, machineType: 'washer' | 'dryer'): void => {
    if (!user) return;

    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('machine-cancel', {
        machineId: String(machineId),
        machineType: machineType,
        studentId: user.studentId,
      });
    }

    setMachines((prev: Machine[]) => prev.map((machine: Machine) => 
      machine.id === machineId && machine.type === machineType
        ? { ...machine, status: 'available', timeLeft: 0, mode: null, userStudentId: null, userPhone: null }
        : machine
    ));
    showNotification('Machine cancelled');
  };

  const joinWaitlist = (type: string): void => {
    if (!user) return;

    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('waitlist-join', {
        machineType: type,
        studentId: user.studentId,
        phoneNumber: user.phoneNumber,
      });
    }

    const listKey = type === 'washer' ? 'washers' : 'dryers';
    if (!waitlists[listKey].some((u: WaitlistEntry) => u.studentId === user.studentId)) {
      setWaitlists((prev: Waitlists) => ({
        ...prev,
        [listKey]: [...prev[listKey], { studentId: user.studentId, phone: user.phoneNumber }]
      }));
      showNotification(`Joined ${type} waitlist`);
    }
  };

  const leaveWaitlist = (type: string): void => {
    if (!user) return;

    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('waitlist-leave', {
        machineType: type,
        studentId: user.studentId,
      });
    }

    const listKey = type === 'washer' ? 'washers' : 'dryers';
    setWaitlists((prev: Waitlists) => ({
      ...prev,
      [listKey]: prev[listKey].filter((u: WaitlistEntry) => u.studentId !== user.studentId)
    }));
    showNotification(`Left ${type} waitlist`);
  };

  const toggleMachineLock = (machineId: number, machineType: 'washer' | 'dryer'): void => {
    const machine = machines.find((m) => m.id === machineId && m.type === machineType);
    if (!machine) return;

    const newLockedState = !machine.locked;

    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('machine-lock', {
        machineId: String(machineId),
        machineType: machineType,
        locked: newLockedState,
      });
    }

    setMachines((prev: Machine[]) => prev.map((m: Machine) => 
      m.id === machineId && m.type === machineType
        ? { ...m, locked: newLockedState, status: newLockedState ? 'maintenance' : 'available' }
        : m
    ));
  };

  const reportIssue = (): void => {
    if (!user || !selectedMachine) return;

    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('issue-report', {
        machineId: String(selectedMachine.id),
        machineType: selectedMachine.type,
        reportedBy: user.studentId,
        phone: user.phoneNumber,
        description: issueDescription,
      });
    }

    const newIssue: ReportedIssue = {
      id: Date.now(),
      machineType: selectedMachine.type,
      machineId: selectedMachine.id,
      reportedBy: user.studentId,
      phone: user.phoneNumber,
      description: issueDescription,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      resolved: false
    };

    setReportedIssues((prev: ReportedIssue[]) => [...prev, newIssue]);
    showNotification('Issue reported successfully!');
    setShowReportIssue(false);
    setSelectedMachine(null);
    setIssueDescription('');
  };

  const resolveIssue = (issueId: number): void => {
    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('issue-resolve', {
        issueId: String(issueId),
        resolved: true,
      });
    }

    setReportedIssues((prev: ReportedIssue[]) => 
      prev.map((issue: ReportedIssue) => 
        issue.id === issueId ? { ...issue, resolved: true } : issue
      )
    );
  };

  const deleteIssue = (issueId: number): void => {
    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('issue-delete', {
        issueId: String(issueId),
      });
    }

    setReportedIssues((prev: ReportedIssue[]) => prev.filter((issue: ReportedIssue) => issue.id !== issueId));
  };

  const changeMachineAvailability = (machineId: number, machineType: 'washer' | 'dryer', newStatus: 'available' | 'maintenance'): void => {
    setMachines((prev: Machine[]) => prev.map((machine: Machine) => 
      machine.id === machineId && machine.type === machineType
        ? { ...machine, status: newStatus, locked: newStatus === 'maintenance' }
        : machine
    ));
  };

  const calculateWaitTime = (position: number, type: string): number => {
    const avgTime = type === 'washer' ? 40 : 45;
    return position * avgTime;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getStats = (): { totalWashes: number; totalMinutes: number; mostUsedMode: Record<string, number> } => {
    if (!user) return { totalWashes: 0, totalMinutes: 0, mostUsedMode: {} };

    const totalWashes = usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId).length;
    const totalMinutes = usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId).reduce((sum: number, h: UsageHistory) => sum + h.duration, 0);
    
    const mostUsedMode = usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId).reduce((acc: Record<string, number>, h: UsageHistory) => {
      acc[h.mode] = (acc[h.mode] || 0) + 1;
      return acc;
    }, {});

    return { totalWashes, totalMinutes, mostUsedMode };
  };

  const stats = getStats();

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode 
        ? 'bg-gray-900 text-white' 
        : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-black'
    }`}>
      {/* Header */}
      <header className={`shadow-md sticky top-0 z-40 transition-colors ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Waves className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">KY Wash</span>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>ID: {user.studentId}</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  darkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-black hover:bg-gray-300'
                }`}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button
                onClick={() => {
                  setUser(null);
                  setCurrentView('main');
                  setShowLogin(true);
                  setUsageHistory([]);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Login View */}
        {showLogin && !user && (
          <div className={`max-w-md mx-auto rounded-lg shadow-lg p-8 transition-colors ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {showAdminLogin ? (
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Admin Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
                    }`}
                    placeholder="Enter admin password"
                  />
                </div>
                {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
                <button
                  onClick={handleAdminLogin}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Login'}
                </button>
                <button
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPassword('');
                    setError('');
                  }}
                  className="w-full mt-2 text-blue-600 hover:text-blue-700"
                >
                  Back to User Login
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">{isRegistering ? 'Register' : 'Login'}</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Student ID (6 digits)</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
                    }`}
                    placeholder="123456"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Phone (10-11 digits)</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
                    }`}
                    placeholder="01234567890"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Password (8 digits)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'
                    }`}
                    placeholder="12345678"
                  />
                </div>
                {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Login'}
                </button>
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="w-full mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Admin Login
                </button>
              </>
            )}
          </div>
        )}

        {/* Admin Panel */}
        {currentView === 'admin' && !user && (
          <div className="space-y-6">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Admin Panel</h1>

            {/* Machine Availability Control */}
            <div className={`rounded-lg shadow-md p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Machine Availability Control
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Washers */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Washers</h3>
                  <div className="space-y-2">
                    {machines.filter((m: Machine) => m.type === 'washer').map((machine: Machine) => (
                      <div key={`washer-${machine.id}`} className={`flex items-center justify-between p-3 rounded transition-colors ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <span className="font-medium">Washer {machine.id}</span>
                        <select
                          value={machine.status}
                          onChange={(e) => changeMachineAvailability(machine.id, 'washer', e.target.value as 'available' | 'maintenance')}
                          className={`px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                            darkMode ? 'bg-gray-600 text-white border-gray-500' : 'bg-white text-black border-gray-300'
                          }`}
                        >
                          <option value="available">Available</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dryers */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dryers</h3>
                  <div className="space-y-2">
                    {machines.filter((m: Machine) => m.type === 'dryer').map((machine: Machine) => (
                      <div key={`dryer-${machine.id}`} className={`flex items-center justify-between p-3 rounded transition-colors ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <span className="font-medium">Dryer {machine.id}</span>
                        <select
                          value={machine.status}
                          onChange={(e) => changeMachineAvailability(machine.id, 'dryer', e.target.value as 'available' | 'maintenance')}
                          className={`px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                            darkMode ? 'bg-gray-600 text-white border-gray-500' : 'bg-white text-black border-gray-300'
                          }`}
                        >
                          <option value="available">Available</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reported Issues */}
            <div className={`rounded-lg shadow-md p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                <AlertCircle className="w-6 h-6" />
                Reported Issues ({reportedIssues.length})
              </h2>
              
              {reportedIssues.length === 0 ? (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No reported issues</p>
              ) : (
                <div className="space-y-3">
                  {reportedIssues.map((issue: ReportedIssue) => (
                    <div
                      key={issue.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        issue.resolved 
                          ? darkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-300'
                          : darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">
                            {issue.machineType.charAt(0).toUpperCase() + issue.machineType.slice(1)} {issue.machineId}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Reported by: {issue.reportedBy} ({issue.phone})</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{issue.date}</p>
                        </div>
                        <div className="flex gap-2">
                          {!issue.resolved && (
                            <button
                              onClick={() => resolveIssue(issue.id)}
                              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                                darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => deleteIssue(issue.id)}
                            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                              darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className={`text-sm mt-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{issue.description}</p>
                      {issue.resolved && <p className={`text-xs mt-2 font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>✓ Resolved</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Machines Status */}
            <div className={`rounded-lg shadow-md p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Current Machines Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {machines.map((machine: Machine) => (
                  <div key={`${machine.type}-${machine.id}`} className={`p-4 rounded-lg border-2 transition-colors ${
                    machine.status === 'available' 
                      ? darkMode ? 'border-green-600 bg-green-900' : 'border-green-500 bg-green-50'
                      : machine.status === 'running'
                      ? darkMode ? 'border-yellow-600 bg-yellow-900' : 'border-yellow-500 bg-yellow-50'
                      : darkMode ? 'border-red-600 bg-red-900' : 'border-red-500 bg-red-50'
                  }`}>
                    <p className={`font-semibold capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>{machine.type} {machine.id}</p>
                    <p className={`text-sm capitalize ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{machine.status}</p>
                    {machine.status === 'running' && (
                      <>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>User: {machine.userStudentId}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Time Left: {formatTime(machine.timeLeft)}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* User Main View */}
        {user && (
          <div className="space-y-6">
            {/* Navigation Tabs */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCurrentView('main')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentView === 'main'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Waves className="w-4 h-4 inline mr-2" />
                Machines
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentView === 'history'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <History className="w-4 h-4 inline mr-2" />
                History
              </button>
              <button
                onClick={() => setCurrentView('stats')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentView === 'stats'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Stats
              </button>
              <button
                onClick={() => setShowEditProfile(true)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Edit2 className="w-4 h-4 inline mr-2" />
                Profile
              </button>
            </div>

            {/* Machines Grid */}
            {currentView === 'main' && (
              <>
                {/* Washer Waitlist Section - Above Machines */}
                <div className={`rounded-lg shadow-md p-6 transition-colors border-l-4 ${
                  darkMode ? 'bg-gray-800 border-blue-600' : 'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${
                      darkMode ? 'text-white' : 'text-blue-900'
                    }`}>
                      <Users className="w-5 h-5" />
                      Washer Waitlist
                    </h2>
                    <span className={`px-3 py-1 rounded-full font-semibold ${
                      darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-900'
                    }`}>
                      {waitlists.washers.length} waiting
                    </span>
                  </div>
                  
                  {waitlists.washers.length === 0 ? (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-blue-700'}`}>No one is waiting for washers</p>
                  ) : (
                    <div className="space-y-2">
                      {waitlists.washers.map((entry: WaitlistEntry, idx: number) => (
                        <div key={`${entry.studentId}-${idx}`} className={`p-3 rounded-lg border transition-colors ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-blue-200'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                #{idx + 1}: {entry.studentId}
                              </p>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Est. Wait: {calculateWaitTime(idx, 'washer')} min
                              </p>
                            </div>
                            <button
                              onClick={() => setShowWasherWaitlist(!showWasherWaitlist)}
                              className={`text-sm px-3 py-1 rounded transition-colors ${
                                showWasherWaitlist ? darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-200 text-blue-900' : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {showWasherWaitlist ? 'Hide' : 'Details'}
                            </button>
                          </div>
                          {showWasherWaitlist && (
                            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-blue-200'}`}>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span className="font-medium">Phone:</span> {entry.phone}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!waitlists.washers.some((u: WaitlistEntry) => u.studentId === user.studentId) && (
                    <button
                      onClick={() => joinWaitlist('washer')}
                      className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Join Washer Waitlist
                    </button>
                  )}
                  {waitlists.washers.some((u: WaitlistEntry) => u.studentId === user.studentId) && (
                    <button
                      onClick={() => leaveWaitlist('washer')}
                      className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      Leave Washer Waitlist
                    </button>
                  )}
                </div>

                {/* Dryer Waitlist Section - Above Machines */}
                <div className={`rounded-lg shadow-md p-6 transition-colors border-l-4 ${
                  darkMode ? 'bg-gray-800 border-purple-600' : 'bg-purple-50 border-purple-400'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${
                      darkMode ? 'text-white' : 'text-purple-900'
                    }`}>
                      <Users className="w-5 h-5" />
                      Dryer Waitlist
                    </h2>
                    <span className={`px-3 py-1 rounded-full font-semibold ${
                      darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-200 text-purple-900'
                    }`}>
                      {waitlists.dryers.length} waiting
                    </span>
                  </div>
                  
                  {waitlists.dryers.length === 0 ? (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-purple-700'}`}>No one is waiting for dryers</p>
                  ) : (
                    <div className="space-y-2">
                      {waitlists.dryers.map((entry: WaitlistEntry, idx: number) => (
                        <div key={`${entry.studentId}-${idx}`} className={`p-3 rounded-lg border transition-colors ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-purple-200'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                #{idx + 1}: {entry.studentId}
                              </p>
                              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Est. Wait: {calculateWaitTime(idx, 'dryer')} min
                              </p>
                            </div>
                            <button
                              onClick={() => setShowDryerWaitlist(!showDryerWaitlist)}
                              className={`text-sm px-3 py-1 rounded transition-colors ${
                                showDryerWaitlist ? darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-200 text-purple-900' : darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {showDryerWaitlist ? 'Hide' : 'Details'}
                            </button>
                          </div>
                          {showDryerWaitlist && (
                            <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-600' : 'border-purple-200'}`}>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span className="font-medium">Phone:</span> {entry.phone}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!waitlists.dryers.some((u: WaitlistEntry) => u.studentId === user.studentId) && (
                    <button
                      onClick={() => joinWaitlist('dryer')}
                      className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        darkMode ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      Join Dryer Waitlist
                    </button>
                  )}
                  {waitlists.dryers.some((u: WaitlistEntry) => u.studentId === user.studentId) && (
                    <button
                      onClick={() => leaveWaitlist('dryer')}
                      className={`w-full mt-4 px-4 py-2 rounded-lg font-semibold transition-colors ${
                        darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      Leave Dryer Waitlist
                    </button>
                  )}
                </div>

                {/* Washers */}
                <div className={`rounded-lg shadow-md p-6 transition-colors ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    <Waves className="w-6 h-6" />
                    Washers
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {machines.filter((m: Machine) => m.type === 'washer').map((machine: Machine) => (
                      <div
                        key={`washer-${machine.id}`}
                        className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                          machine.locked
                            ? darkMode ? 'border-red-600 bg-red-900 opacity-60' : 'border-red-500 bg-red-50 opacity-60'
                            : machine.status === 'available'
                            ? darkMode ? 'border-green-600 bg-green-900 hover:shadow-lg' : 'border-green-500 bg-green-50 hover:shadow-lg'
                            : darkMode ? 'border-yellow-600 bg-yellow-900' : 'border-yellow-500 bg-yellow-50'
                        }`}
                        onClick={() => !machine.locked && machine.status === 'available' && setSelectedMachine(machine)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Washer {machine.id}</p>
                            <p className={`text-sm font-semibold capitalize ${
                              machine.status === 'available' ? darkMode ? 'text-green-400' : 'text-green-600' :
                              machine.status === 'running' ? darkMode ? 'text-yellow-400' : 'text-yellow-600' : darkMode ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {machine.locked ? 'MAINTENANCE' : machine.status}
                            </p>
                          </div>
                          {machine.locked && <Lock className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />}
                        </div>

                        {machine.status === 'running' && (
                          <>
                            <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Mode: {machine.mode}</p>
                            <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>User: {machine.userStudentId}</p>
                            <p className={`text-2xl font-bold text-center py-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {formatTime(machine.timeLeft)}
                            </p>
                            {machine.userStudentId === user.studentId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelMachine(machine.id, 'washer');
                                }}
                                className={`w-full mt-3 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                  darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                                }`}
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}

                        {machine.status === 'available' && !machine.locked && (
                          <>
                            <div className="space-y-2 mb-3">
                              {modes.map((mode: Mode) => (
                                <button
                                  key={mode.name}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startMachine(machine.id, 'washer', mode);
                                  }}
                                  className={`w-full px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                    darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                                  }`}
                                >
                                  {mode.name} ({mode.duration}m)
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMachine(machine);
                                setShowReportIssue(true);
                              }}
                              className={`w-full px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                darkMode ? 'bg-orange-700 hover:bg-orange-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                              }`}
                            >
                              Report Issue
                            </button>

                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dryers */}
                <div className={`rounded-lg shadow-md p-6 transition-colors ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>
                    <Waves className="w-6 h-6" />
                    Dryers
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {machines.filter((m: Machine) => m.type === 'dryer').map((machine: Machine) => (
                      <div
                        key={`dryer-${machine.id}`}
                        className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                          machine.locked
                            ? darkMode ? 'border-red-600 bg-red-900 opacity-60' : 'border-red-500 bg-red-50 opacity-60'
                            : machine.status === 'available'
                            ? darkMode ? 'border-green-600 bg-green-900 hover:shadow-lg' : 'border-green-500 bg-green-50 hover:shadow-lg'
                            : darkMode ? 'border-yellow-600 bg-yellow-900' : 'border-yellow-500 bg-yellow-50'
                        }`}
                        onClick={() => !machine.locked && machine.status === 'available' && setSelectedMachine(machine)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Dryer {machine.id}</p>
                            <p className={`text-sm font-semibold capitalize ${
                              machine.status === 'available' ? darkMode ? 'text-green-400' : 'text-green-600' :
                              machine.status === 'running' ? darkMode ? 'text-yellow-400' : 'text-yellow-600' : darkMode ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {machine.locked ? 'MAINTENANCE' : machine.status}
                            </p>
                          </div>
                          {machine.locked && <Lock className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />}
                        </div>

                        {machine.status === 'running' && (
                          <>
                            <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Mode: {machine.mode}</p>
                            <p className={`text-sm mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>User: {machine.userStudentId}</p>
                            <p className={`text-2xl font-bold text-center py-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {formatTime(machine.timeLeft)}
                            </p>
                            {machine.userStudentId === user.studentId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelMachine(machine.id, 'dryer');
                                }}
                                className={`w-full mt-3 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                  darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                                }`}
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}

                        {machine.status === 'available' && !machine.locked && (
                          <>
                            <div className="space-y-2 mb-3">
                              {modes.map((mode: Mode) => (
                                <button
                                  key={mode.name}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startMachine(machine.id, 'dryer', mode);
                                  }}
                                  className={`w-full px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                    darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                                  }`}
                                >
                                  {mode.name} ({mode.duration}m)
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMachine(machine);
                                setShowReportIssue(true);
                              }}
                              className={`w-full px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                darkMode ? 'bg-orange-700 hover:bg-orange-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                              }`}
                            >
                              Report Issue
                            </button>

                          </>
                        )}
                      </div>
                    ))}
                  </div>


                </div>
              </>
            )}

            {/* Usage History View */}
            {currentView === 'history' && user && (
              <div className={`rounded-lg shadow-md p-6 transition-colors ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                  darkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  <History className="w-6 h-6" />
                  Usage History
                </h2>
                {usageHistory.filter((h: UsageHistory) => h.studentId === user!.studentId).length === 0 ? (
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No usage history</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <tr>
                          <th className={`px-4 py-2 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Machine</th>
                          <th className={`px-4 py-2 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mode</th>
                          <th className={`px-4 py-2 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Duration</th>
                          <th className={`px-4 py-2 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageHistory.filter((h: UsageHistory) => h.studentId === user!.studentId).map((record: UsageHistory) => (
                          <tr key={record.id} className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                            <td className={`px-4 py-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{record.machineType} {record.machineId}</td>
                            <td className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.mode}</td>
                            <td className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.duration} min</td>
                            <td className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Stats View */}
            {currentView === 'stats' && user && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`rounded-lg shadow-md p-6 text-center transition-colors ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <Waves className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Washes</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{stats.totalWashes}</p>
                </div>
                <div className={`rounded-lg shadow-md p-6 text-center transition-colors ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <Clock className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                  <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Minutes</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{stats.totalMinutes}</p>
                </div>
                <div className={`rounded-lg shadow-md p-6 text-center transition-colors ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                  <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Duration</p>
                  <p className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                    {stats.totalWashes > 0 ? Math.round(stats.totalMinutes / stats.totalWashes) : 0}m
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      {showReportIssue && selectedMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow-lg max-w-md w-full p-6 transition-colors ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Report Issue</h3>
              <button onClick={() => setShowReportIssue(false)} className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedMachine.type.charAt(0).toUpperCase() + selectedMachine.type.slice(1)} {selectedMachine.id}
            </p>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Describe the issue..."
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 transition-colors ${
                darkMode ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' : 'bg-white text-gray-800 border-gray-300 placeholder-gray-500'
              }`}
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={reportIssue}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  darkMode ? 'bg-blue-700 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Submit
              </button>
              <button
                onClick={() => setShowReportIssue(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg shadow-lg max-w-md w-full p-6 transition-colors ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)} className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Student ID</label>
                <input
                  type="text"
                  value={user.studentId}
                  disabled
                  className={`w-full px-4 py-2 border rounded-lg cursor-not-allowed transition-colors ${
                    darkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                <input
                  type="text"
                  value={user.phoneNumber}
                  disabled
                  className={`w-full px-4 py-2 border rounded-lg cursor-not-allowed transition-colors ${
                    darkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300'
                  }`}
                />
              </div>
              <button
                onClick={() => setShowEditProfile(false)}
                className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Edit Profile</h3>
              <button onClick={() => setShowEditProfile(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Student ID</label>
                <input
                  type="text"
                  value={user.studentId}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="text"
                  value={user.phoneNumber}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <button
                onClick={() => setShowEditProfile(false)}
                className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYWashSystem;
