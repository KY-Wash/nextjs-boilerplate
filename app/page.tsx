'use client';

import React, { useState, useEffect } from 'react';
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

  const modes: Mode[] = [
    { name: 'Normal', duration: 30 },
    { name: 'Extra 5 min', duration: 35 },
    { name: 'Extra 10 min', duration: 40 },
    { name: 'Extra 15 min', duration: 45 }
  ];

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

    showNotification(`${machineType.charAt(0).toUpperCase() + machineType.slice(1)} ${machineId} started!`);
  };

  const cancelMachine = (machineId: number, machineType: 'washer' | 'dryer'): void => {
    setMachines((prev: Machine[]) => prev.map((machine: Machine) => 
      machine.id === machineId && machine.type === machineType
        ? { ...machine, status: 'available', timeLeft: 0, mode: null, userStudentId: null, userPhone: null }
        : machine
    ));
    showNotification('Machine cancelled');
  };

  const joinWaitlist = (type: string): void => {
    if (!user) return;

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

    const listKey = type === 'washer' ? 'washers' : 'dryers';
    setWaitlists((prev: Waitlists) => ({
      ...prev,
      [listKey]: prev[listKey].filter((u: WaitlistEntry) => u.studentId !== user.studentId)
    }));
    showNotification(`Left ${type} waitlist`);
  };

  const toggleMachineLock = (machineId: number, machineType: 'washer' | 'dryer'): void => {
    setMachines((prev: Machine[]) => prev.map((machine: Machine) => 
      machine.id === machineId && machine.type === machineType
        ? { ...machine, locked: !machine.locked, status: !machine.locked ? 'maintenance' : 'available' }
        : machine
    ));
  };

  const reportIssue = (): void => {
    if (!user || !selectedMachine) return;

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
    setReportedIssues((prev: ReportedIssue[]) => 
      prev.map((issue: ReportedIssue) => 
        issue.id === issueId ? { ...issue, resolved: true } : issue
      )
    );
  };

  const deleteIssue = (issueId: number): void => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Waves className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">KY Wash</span>
          </div>
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">ID: {user.studentId}</span>
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
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter admin password"
                  />
                </div>
                {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Phone (10-11 digits)</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345678"
                  />
                </div>
                {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
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
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>

            {/* Machine Availability Control */}
            <div className="bg-white rounded-lg shadow-md p-6">
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
                      <div key={`washer-${machine.id}`} className="flex items-center justify-between bg-gray-100 p-3 rounded">
                        <span className="font-medium">Washer {machine.id}</span>
                        <select
                          value={machine.status}
                          onChange={(e) => changeMachineAvailability(machine.id, 'washer', e.target.value as 'available' | 'maintenance')}
                          className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <div key={`dryer-${machine.id}`} className="flex items-center justify-between bg-gray-100 p-3 rounded">
                        <span className="font-medium">Dryer {machine.id}</span>
                        <select
                          value={machine.status}
                          onChange={(e) => changeMachineAvailability(machine.id, 'dryer', e.target.value as 'available' | 'maintenance')}
                          className="px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Reported Issues ({reportedIssues.length})
              </h2>
              
              {reportedIssues.length === 0 ? (
                <p className="text-gray-500">No reported issues</p>
              ) : (
                <div className="space-y-3">
                  {reportedIssues.map((issue: ReportedIssue) => (
                    <div
                      key={issue.id}
                      className={`p-4 border rounded-lg ${
                        issue.resolved ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">
                            {issue.machineType.charAt(0).toUpperCase() + issue.machineType.slice(1)} {issue.machineId}
                          </p>
                          <p className="text-sm text-gray-600">Reported by: {issue.reportedBy} ({issue.phone})</p>
                          <p className="text-sm text-gray-600">{issue.date}</p>
                        </div>
                        <div className="flex gap-2">
                          {!issue.resolved && (
                            <button
                              onClick={() => resolveIssue(issue.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                            >
                              Resolve
                            </button>
                          )}
                          <button
                            onClick={() => deleteIssue(issue.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm mt-2">{issue.description}</p>
                      {issue.resolved && <p className="text-xs text-green-600 mt-2">✓ Resolved</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Machines Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4">Current Machines Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {machines.map((machine: Machine) => (
                  <div key={`${machine.type}-${machine.id}`} className={`p-4 rounded-lg border-2 ${
                    machine.status === 'available' ? 'border-green-500 bg-green-50' :
                    machine.status === 'running' ? 'border-yellow-500 bg-yellow-50' :
                    'border-red-500 bg-red-50'
                  }`}>
                    <p className="font-semibold capitalize">{machine.type} {machine.id}</p>
                    <p className="text-sm capitalize">{machine.status}</p>
                    {machine.status === 'running' && (
                      <>
                        <p className="text-sm">User: {machine.userStudentId}</p>
                        <p className="text-sm">Time Left: {formatTime(machine.timeLeft)}</p>
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
                    : 'bg-white text-gray-700 hover:bg-gray-100'
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
                    : 'bg-white text-gray-700 hover:bg-gray-100'
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
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Stats
              </button>
              <button
                onClick={() => setShowEditProfile(true)}
                className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-100 transition"
              >
                <Edit2 className="w-4 h-4 inline mr-2" />
                Profile
              </button>
            </div>

            {/* Machines Grid */}
            {currentView === 'main' && (
              <>
                {/* Washers */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Waves className="w-6 h-6" />
                    Washers
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {machines.filter((m: Machine) => m.type === 'washer').map((machine: Machine) => (
                      <div
                        key={`washer-${machine.id}`}
                        className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                          machine.locked
                            ? 'border-red-500 bg-red-50 opacity-60'
                            : machine.status === 'available'
                            ? 'border-green-500 bg-green-50 hover:shadow-lg'
                            : 'border-yellow-500 bg-yellow-50'
                        }`}
                        onClick={() => !machine.locked && machine.status === 'available' && setSelectedMachine(machine)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-lg font-bold">Washer {machine.id}</p>
                            <p className={`text-sm font-semibold capitalize ${
                              machine.status === 'available' ? 'text-green-600' :
                              machine.status === 'running' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {machine.locked ? 'MAINTENANCE' : machine.status}
                            </p>
                          </div>
                          {machine.locked && <Lock className="w-5 h-5 text-red-500" />}
                        </div>

                        {machine.status === 'running' && (
                          <>
                            <p className="text-sm text-gray-600 mb-1">Mode: {machine.mode}</p>
                            <p className="text-sm text-gray-600 mb-1">User: {machine.userStudentId}</p>
                            <p className="text-2xl font-bold text-blue-600 text-center py-2">
                              {formatTime(machine.timeLeft)}
                            </p>
                            {machine.userStudentId === user.studentId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelMachine(machine.id, 'washer');
                                }}
                                className="w-full mt-3 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
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
                                  className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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
                              className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                            >
                              Report Issue
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                joinWaitlist('washer');
                              }}
                              className={`w-full mt-2 px-3 py-2 rounded text-sm ${
                                waitlists.washers.some((u: WaitlistEntry) => u.studentId === user.studentId)
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-gray-500 text-white hover:bg-gray-600'
                              }`}
                            >
                              {waitlists.washers.some((u: WaitlistEntry) => u.studentId === user.studentId)
                                ? 'Leave Waitlist'
                                : 'Join Waitlist'
                              }
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Washer Waitlist */}
                  {waitlists.washers.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-300">
                      <button
                        onClick={() => setShowWasherWaitlist(!showWasherWaitlist)}
                        className="flex items-center gap-2 font-semibold text-blue-700 w-full"
                      >
                        {showWasherWaitlist ? <ChevronUp /> : <ChevronDown />}
                        Washer Waitlist ({waitlists.washers.length})
                      </button>
                      {showWasherWaitlist && (
                        <div className="mt-3 space-y-2">
                          {waitlists.washers.map((entry: WaitlistEntry, idx: number) => (
                            <div key={`${entry.studentId}-${idx}`} className="p-2 bg-white rounded border">
                              <p className="font-medium">#{idx + 1}: {entry.studentId}</p>
                              <p className="text-sm text-gray-600">Est. Wait: {calculateWaitTime(idx, 'washer')} min</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Dryers */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Waves className="w-6 h-6" />
                    Dryers
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {machines.filter((m: Machine) => m.type === 'dryer').map((machine: Machine) => (
                      <div
                        key={`dryer-${machine.id}`}
                        className={`p-4 rounded-lg border-2 transition cursor-pointer ${
                          machine.locked
                            ? 'border-red-500 bg-red-50 opacity-60'
                            : machine.status === 'available'
                            ? 'border-green-500 bg-green-50 hover:shadow-lg'
                            : 'border-yellow-500 bg-yellow-50'
                        }`}
                        onClick={() => !machine.locked && machine.status === 'available' && setSelectedMachine(machine)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-lg font-bold">Dryer {machine.id}</p>
                            <p className={`text-sm font-semibold capitalize ${
                              machine.status === 'available' ? 'text-green-600' :
                              machine.status === 'running' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {machine.locked ? 'MAINTENANCE' : machine.status}
                            </p>
                          </div>
                          {machine.locked && <Lock className="w-5 h-5 text-red-500" />}
                        </div>

                        {machine.status === 'running' && (
                          <>
                            <p className="text-sm text-gray-600 mb-1">Mode: {machine.mode}</p>
                            <p className="text-sm text-gray-600 mb-1">User: {machine.userStudentId}</p>
                            <p className="text-2xl font-bold text-blue-600 text-center py-2">
                              {formatTime(machine.timeLeft)}
                            </p>
                            {machine.userStudentId === user.studentId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelMachine(machine.id, 'dryer');
                                }}
                                className="w-full mt-3 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
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
                                  className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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
                              className="w-full px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                            >
                              Report Issue
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                joinWaitlist('dryer');
                              }}
                              className={`w-full mt-2 px-3 py-2 rounded text-sm ${
                                waitlists.dryers.some((u: WaitlistEntry) => u.studentId === user.studentId)
                                  ? 'bg-red-500 text-white hover:bg-red-600'
                                  : 'bg-gray-500 text-white hover:bg-gray-600'
                              }`}
                            >
                              {waitlists.dryers.some((u: WaitlistEntry) => u.studentId === user.studentId)
                                ? 'Leave Waitlist'
                                : 'Join Waitlist'
                              }
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Dryer Waitlist */}
                  {waitlists.dryers.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-300">
                      <button
                        onClick={() => setShowDryerWaitlist(!showDryerWaitlist)}
                        className="flex items-center gap-2 font-semibold text-blue-700 w-full"
                      >
                        {showDryerWaitlist ? <ChevronUp /> : <ChevronDown />}
                        Dryer Waitlist ({waitlists.dryers.length})
                      </button>
                      {showDryerWaitlist && (
                        <div className="mt-3 space-y-2">
                          {waitlists.dryers.map((entry: WaitlistEntry, idx: number) => (
                            <div key={`${entry.studentId}-${idx}`} className="p-2 bg-white rounded border">
                              <p className="font-medium">#{idx + 1}: {entry.studentId}</p>
                              <p className="text-sm text-gray-600">Est. Wait: {calculateWaitTime(idx, 'dryer')} min</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Usage History View */}
            {currentView === 'history' && user && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <History className="w-6 h-6" />
                  Usage History
                </h2>
                {usageHistory.filter((h: UsageHistory) => h.studentId === user!.studentId).length === 0 ? (
                  <p className="text-gray-500">No usage history</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Machine</th>
                          <th className="px-4 py-2 text-left">Mode</th>
                          <th className="px-4 py-2 text-left">Duration</th>
                          <th className="px-4 py-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageHistory.filter((h: UsageHistory) => h.studentId === user!.studentId).map((record: UsageHistory) => (
                          <tr key={record.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">{record.machineType} {record.machineId}</td>
                            <td className="px-4 py-2">{record.mode}</td>
                            <td className="px-4 py-2">{record.duration} min</td>
                            <td className="px-4 py-2">{record.date}</td>
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
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <Waves className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm mb-1">Total Washes</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalWashes}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <Clock className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm mb-1">Total Minutes</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalMinutes}</p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <TrendingUp className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm mb-1">Avg. Duration</p>
                  <p className="text-3xl font-bold text-purple-600">
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
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Report Issue</h3>
              <button onClick={() => setShowReportIssue(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {selectedMachine.type.charAt(0).toUpperCase() + selectedMachine.type.slice(1)} {selectedMachine.id}
            </p>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            />
            <div className="flex gap-2">
              <button
                onClick={reportIssue}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit
              </button>
              <button
                onClick={() => setShowReportIssue(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
