'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Waves, Loader2, Clock, Users, AlertCircle, LogOut, Settings, ChevronDown, ChevronUp, Lock, Unlock, History, TrendingUp, X, Edit2, BarChart3, Trash2 } from 'lucide-react';
import { insertUsageRecord, updateUsageRecordStatus } from '@/lib/supabase';

interface User {
  studentId: string;
  phoneNumber: string;
  password?: string;
}

interface Machine {
  id: number;
  type: 'washer' | 'dryer';
  status: 'available' | 'running' | 'maintenance' | 'pending-collection';
  timeLeft: number;
  mode: string | null;
  locked: boolean;
  userStudentId: string | null;
  userPhone: string | null;
  originalDuration?: number;
  cancellable?: boolean;
}

interface WaitlistEntry {
  studentId: string;
  phone: string;
}

interface UsageHistory {
  id: string;
  supabase_id?: string; // Track Supabase record ID for updates
  machineType: string;
  machineId: number;
  mode: string;
  duration: number;
  date: string;
  studentId: string;
  timestamp: number;
  spending?: number;
  status?: 'In Progress' | 'Completed' | 'cancelled';
}

interface ReportedIssue {
  id: string;
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
  const [currentView, setCurrentView] = useState<'main' | 'admin' | 'history' | 'stats' | 'dryer-stats'>('main' as 'main' | 'admin' | 'history' | 'stats' | 'dryer-stats');
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
  const [editProfilePhone, setEditProfilePhone] = useState<string>('');
  const [editProfileStudentId, setEditProfileStudentId] = useState<string>('');
  const [editProfilePassword, setEditProfilePassword] = useState<string>('');
  const [editProfilePasswordConfirm, setEditProfilePasswordConfirm] = useState<string>('');
  const [reportedIssues, setReportedIssues] = useState<ReportedIssue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [expandedWasherWaitlist, setExpandedWasherWaitlist] = useState<boolean>(false);
  const [expandedDryerWaitlist, setExpandedDryerWaitlist] = useState<boolean>(false);

  const washerModes: Mode[] = [
    { name: 'Normal', duration: 30 },
    { name: 'Extra Wash', duration: 40 }
  ];

  const dryerModes: Mode[] = [
    { name: 'Normal', duration: 30 },
    { name: 'Extra Dry', duration: 40 }
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
            
            // Update machines - preserve originalDuration if present
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
                originalDuration: m.originalDuration || undefined,
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
                  spending: record.spending || 0,
                  status: record.status || 'completed',
                }))
              );
            }

            // Update users
            if (newState.users) {
              setUsers(newState.users);
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

          // Update machines from API
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
              originalDuration: m.originalDuration || undefined,
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
              spending: record.spending || 0,
              status: record.status || 'completed',
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch state:', error);
      }
    };

    // Fetch initial state
    fetchState();

    // Poll every 500ms (twice per second) for smooth timer display every 1 second
    pollingIntervalRef.current = setInterval(fetchState, 500);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Persist usage history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kyWashUsageHistory', JSON.stringify(usageHistory));
    }
  }, [usageHistory]);

  // Persist user to localStorage whenever they login/logout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('kyWashUser', JSON.stringify(user));
      }
    }
  }, [user]);

  // Load usage history from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem('kyWashUsageHistory');
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          setUsageHistory(parsedHistory);
        } catch (error) {
          console.error('Failed to load history from localStorage:', error);
        }
      }
      
      // Load persisted user login if available
      const savedUser = localStorage.getItem('kyWashUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setShowLogin(false);
          setCurrentView('main');
        } catch (error) {
          console.error('Failed to load user from localStorage:', error);
        }
      }
    }
  }, []);

  // Track machines that have already triggered completion notification
  const notifiedMachinesRef = useRef<Set<string>>(new Set());
  // Track machines that have already sent 5-minute reminder
  const reminderSentRef = useRef<Set<string>>(new Set());

  // Monitor for completion and trigger notifications with alarm sound
  useEffect(() => {
    machines.forEach((machine) => {
      const machineKey = `${machine.type}-${machine.id}`;
      
      // Check for 5-minute reminder (300 seconds = 5 minutes)
      // Only send to user actively using this machine
      if (machine.status === 'running' && machine.timeLeft === 300 && !reminderSentRef.current.has(machineKey)) {
        if (machine.userStudentId === user?.studentId) {
          reminderSentRef.current.add(machineKey);
          showNotification(`⏰ Reminder: Your ${machine.type} ${machine.id} will be done in 5 minutes!`);
        }
      }
      
      // Check if machine just completed (transitioned to pending-collection)
      // Only send to user who used this machine
      if (machine.status === 'pending-collection' && !notifiedMachinesRef.current.has(machineKey)) {
        if (machine.userStudentId === user?.studentId) {
          notifiedMachinesRef.current.add(machineKey);
          playNotificationSound();
          showNotification(`${machine.type.charAt(0).toUpperCase() + machine.type.slice(1)} ${machine.id} is complete! Please collect your clothes.`);
        }
      }
      
      // Reset notification flags when machine becomes available again
      if (machine.status === 'available' && notifiedMachinesRef.current.has(machineKey)) {
        notifiedMachinesRef.current.delete(machineKey);
        reminderSentRef.current.delete(machineKey);
      }
    });
  }, [machines, user?.studentId]);

  const playNotificationSound = (): void => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Play loud alarm sound sequence (multiple beeps)
      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';
      
      const now = audioContext.currentTime;
      // Play 5 loud beeps with 0.2 second duration each
      for (let i = 0; i < 5; i++) {
        gainNode.gain.setValueAtTime(0.8, now + i * 0.4); // Louder volume (0.8 instead of 0.5)
        gainNode.gain.setValueAtTime(0, now + i * 0.4 + 0.2); // Longer beep duration
      }
      
      oscillator.start(now);
      oscillator.stop(now + 2.0); // Extended stop time for all 5 beeps
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  const showNotification = (message: string): void => {
    // Try Web Notifications API first
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('KY Wash', {
          body: message,
          icon: '/waves.svg',
          badge: '/waves.svg',
          tag: 'ky-wash-notification'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('KY Wash', {
              body: message,
              icon: '/waves.svg',
              badge: '/waves.svg',
              tag: 'ky-wash-notification'
            });
          }
        });
      }
    }
    // Fallback to alert
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

    if (isRegistering) {
      // REGISTRATION MODE
      if (users.some(u => u.studentId === studentId)) {
        setError('This Student ID is already registered. Please login instead.');
        return;
      }
      
      // Register new user
      if (socketRef.current?.emit) {
        socketRef.current.emit('user-register', {
          studentId,
          phone: phoneNumber,
          password,
        });
      }
      setLoading(true);
      setTimeout(() => {
        setUser({ studentId, phoneNumber });
        setShowLogin(false);
        setCurrentView('main');
        setStudentId('');
        setPhoneNumber('');
        setPassword('');
        setIsRegistering(false);
        setLoading(false);
        showNotification('Account created successfully!');
      }, 500);
    } else {
      // LOGIN MODE
      const userRecord = users.find(u => u.studentId === studentId);
      
      if (!userRecord) {
        setError('Student ID not found. Please create a new account.');
        return;
      }
      
      // Validate phone number
      if (userRecord.phoneNumber !== phoneNumber) {
        setError('Phone number is incorrect for this account.');
        return;
      }
      
      // Validate password
      if (userRecord.password !== password) {
        setError('Password is incorrect.');
        return;
      }
      
      // Login successful
      setLoading(true);
      setTimeout(() => {
        setUser({ studentId, phoneNumber });
        setShowLogin(false);
        setCurrentView('main');
        setStudentId('');
        setPhoneNumber('');
        setPassword('');
        setLoading(false);
        showNotification('Login successful!');
      }, 500);
    }
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

    // Check if user is already using a machine
    const userUsingMachine = machines.some((m) => 
      m.userStudentId === user.studentId && 
      (m.status === 'running' || m.status === 'pending-collection')
    );
    
    if (userUsingMachine) {
      alert(`You already have a ${machineType === 'washer' ? 'washer' : 'dryer'} running. Please finish before starting another.`);
      return;
    }

    // Calculate spending based on mode
    const spending = getSpendingForMode(mode.name);

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
            userPhone: user.phoneNumber,
            originalDuration: mode.duration
          }
        : machine
    ));

    // Sync to Supabase
    const now = new Date();
    insertUsageRecord({
      student_id: user.studentId,
      phone_number: user.phoneNumber,
      machine_type: machineType,
      machine_id: machineId,
      mode: mode.name,
      duration: mode.duration,
      spending: spending,
      status: 'In Progress',
      date: now.toLocaleDateString(),
      timestamp: now.getTime(),
    });

    showNotification(`${machineType.charAt(0).toUpperCase() + machineType.slice(1)} ${machineId} started! Phone: ${user.phoneNumber} | Charge: RM${spending}`);
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
        ? { ...machine, status: 'available', timeLeft: 0, mode: null, userStudentId: null, userPhone: null, originalDuration: undefined }
        : machine
    ));
    showNotification('Machine cancelled. Spending not recorded.');
  };

  const joinWaitlist = (type: string): void => {
    if (!user) return;

    // Check if user is already using the same machine type
    const userUsingThisMachine = machines.some((m) => 
      m.userStudentId === user.studentId && 
      m.type === type &&
      (m.status === 'running' || m.status === 'pending-collection')
    );
    
    if (userUsingThisMachine) {
      alert(`You have already started a ${type}. You cannot join the ${type} waitlist while using one.`);
      return;
    }

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

    // Update local state immediately to show changes on admin page
    setMachines((prev: Machine[]) => prev.map((m: Machine) => 
      m.id === machineId && m.type === machineType
        ? { ...m, locked: newLockedState, status: newLockedState ? 'maintenance' : 'available' }
        : m
    ));
    
    // Show notification
    showNotification(`${machineType.charAt(0).toUpperCase() + machineType.slice(1)} ${machineId} ${newLockedState ? 'locked' : 'unlocked'} successfully!`);
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
      id: `${Date.now()}-${Math.random()}`,
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

  const resolveIssue = (issueId: string): void => {
    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('issue-resolve', {
        issueId: issueId,
        resolved: true,
      });
    }

    setReportedIssues((prev: ReportedIssue[]) => 
      prev.map((issue: ReportedIssue) => 
        issue.id === issueId ? { ...issue, resolved: true } : issue
      )
    );
  };

  const deleteIssue = (issueId: string): void => {
    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('issue-delete', {
        issueId: issueId,
      });
    }

    setReportedIssues((prev: ReportedIssue[]) => prev.filter((issue: ReportedIssue) => issue.id !== issueId));
  };

  const clothesCollected = (machineId: number, machineType: 'washer' | 'dryer'): void => {
    if (!user) return;

    // Emit to real-time API
    if (socketRef.current?.emit) {
      socketRef.current.emit('clothes-collected', {
        machineId: String(machineId),
        machineType: machineType,
        studentId: user.studentId,
      });
    }

    // Mark machine as available and notify next waitlist user
    setMachines((prev: Machine[]) => prev.map((machine: Machine) => 
      machine.id === machineId && machine.type === machineType
        ? { ...machine, status: 'available', timeLeft: 0, mode: null, userStudentId: null, userPhone: null }
        : machine
    ));

    showNotification('Clothes collected! Machine is now available for others.');
    notifyWaitlist(machineType);
  };

  const notifyComingToCollect = (machineId: number, machineType: 'washer' | 'dryer'): void => {
    if (!user) return;

    const machine = machines.find((m) => m.id === machineId && m.type === machineType);
    if (!machine) return;

    showNotification(`You notified that you're coming to collect your clothes from ${machineType} ${machineId}.`);
  };

  const calculateWaitTime = (position: number, type: string): number => {
    const avgTime = type === 'washer' ? 40 : 45;
    return position * avgTime;
  };

  const analyzeWashingPatterns = (): { peakHours: number[]; suggestedHours: number[]; description: string } => {
    if (!user || usageHistory.length === 0) {
      return { peakHours: [], suggestedHours: [], description: 'Not enough data to analyze patterns.' };
    }

    const userHistory = usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.machineType === 'washer');
    if (userHistory.length === 0) {
      return { peakHours: [], suggestedHours: [], description: 'Start using washers to see pattern analysis.' };
    }

    // Analyze when the user typically washes (by hour of day)
    const hourDistribution: Record<number, number> = {};
    userHistory.forEach((record: UsageHistory) => {
      const date = new Date(record.timestamp);
      const hour = date.getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });

    // Find peak hours (most usage)
    const sortedHours = Object.entries(hourDistribution)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([hour]) => parseInt(hour));

    const peakHours = sortedHours.slice(0, 3);
    
    // Suggest off-peak hours (least busy - typically late night or early morning)
    const allHours = Array.from({ length: 24 }, (_, i) => i);
    const suggestedHours = allHours
      .filter(h => !peakHours.includes(h))
      .slice(0, 3)
      .sort();

    const description = `Your busiest washing times are around ${peakHours.map(h => `${h}:00`).join(', ')}. Consider washing between ${suggestedHours.map(h => `${h}:00`).join(' and ')} for shorter wait times.`;

    return { peakHours, suggestedHours, description };
  };

  const analyzeDryingPatterns = (): { peakHours: number[]; suggestedHours: number[]; description: string } => {
    if (!user || usageHistory.length === 0) {
      return { peakHours: [], suggestedHours: [], description: 'Not enough data to analyze patterns.' };
    }

    const userHistory = usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.machineType === 'dryer');
    if (userHistory.length === 0) {
      return { peakHours: [], suggestedHours: [], description: 'Start using dryers to see pattern analysis.' };
    }

    // Analyze when the user typically dries (by hour of day)
    const hourDistribution: Record<number, number> = {};
    userHistory.forEach((record: UsageHistory) => {
      const date = new Date(record.timestamp);
      const hour = date.getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });

    // Find peak hours (most usage)
    const sortedHours = Object.entries(hourDistribution)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([hour]) => parseInt(hour));

    const peakHours = sortedHours.slice(0, 3);
    
    // Suggest off-peak hours (least busy - typically late night or early morning)
    const allHours = Array.from({ length: 24 }, (_, i) => i);
    const suggestedHours = allHours
      .filter(h => !peakHours.includes(h))
      .slice(0, 3)
      .sort();

    const description = `Your busiest drying times are around ${peakHours.map(h => `${h}:00`).join(', ')}. Consider drying between ${suggestedHours.map(h => `${h}:00`).join(' and ')} for shorter wait times.`;

    return { peakHours, suggestedHours, description };
  };

  const getWeeklyStats = (): { dayStats: Record<string, number>; totalUsage: number; peakDay: string; avgUsage: number } => {
    // Get stats for the current week (Monday - Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
    endOfWeek.setHours(23, 59, 59, 999);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayStats: Record<string, number> = {};
    days.forEach(day => dayStats[day] = 0);

    // Count all machine usage (washers and dryers) by day of week (exclude cancelled)
    usageHistory.forEach((record: UsageHistory) => {
      if (record.status !== 'cancelled') {
        const recordDate = new Date(record.timestamp);
        if (recordDate >= startOfWeek && recordDate <= endOfWeek) {
          const day = days[recordDate.getDay() === 0 ? 6 : recordDate.getDay() - 1];
          dayStats[day]++;
        }
      }
    });

    const totalUsage = Object.values(dayStats).reduce((a, b) => a + b, 0);
    const avgUsage = totalUsage > 0 ? Math.round(totalUsage / 7) : 0;
    const peakDay = Object.entries(dayStats).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    return { dayStats, totalUsage, peakDay, avgUsage };
  };

  const getCriticalIssues = (): Array<{ machineType: string; machineId: number; reportCount: number; description: string }> => {
    // Get issues that have more than 3 unresolved reports for the same machine
    const issueCounts: Record<string, { count: number; description: string; machineType: string; machineId: number }> = {};
    reportedIssues.forEach((issue: ReportedIssue) => {
      if (!issue.resolved) {
        const key = `${issue.machineType}-${issue.machineId}`;
        if (!issueCounts[key]) {
          issueCounts[key] = { count: 0, description: issue.description, machineType: issue.machineType, machineId: issue.machineId };
        }
        issueCounts[key].count++;
      }
    });

    const criticalIssues: Array<{ machineType: string; machineId: number; reportCount: number; description: string }> = [];
    Object.entries(issueCounts).forEach(([, issueData]) => {
      if (issueData.count > 3) {
        criticalIssues.push({
          machineType: issueData.machineType,
          machineId: issueData.machineId,
          reportCount: issueData.count,
          description: issueData.description
        });
      }
    });

    return criticalIssues;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getSpendingForMode = (mode: string): number => {
    if (mode === 'Normal') return 5;
    if (mode.includes('Extra')) return 6; // Handles both 'Extra Wash' and 'Extra Dry'
    return 0;
  };

  const getStats = (): { totalWashes: number; totalMinutes: number; mostUsedMode: Record<string, number> } => {
    if (!user) return { totalWashes: 0, totalMinutes: 0, mostUsedMode: {} };

    // Exclude cancelled records
    const userHistory = usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.status !== 'cancelled');
    
    const totalWashes = userHistory.length;
    const totalMinutes = userHistory.reduce((sum: number, h: UsageHistory) => sum + h.duration, 0);
    
    const mostUsedMode = userHistory.reduce((acc: Record<string, number>, h: UsageHistory) => {
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
            ) : isRegistering ? (
              // REGISTRATION FORM
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">Create New Account</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Student ID (6 digits)</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.slice(0, 6))}
                    maxLength={6}
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
                    onChange={(e) => setPhoneNumber(e.target.value.slice(0, 11))}
                    maxLength={11}
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
                    onChange={(e) => setPassword(e.target.value.slice(0, 8))}
                    maxLength={8}
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
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Account'}
                </button>
                <button
                  onClick={() => {
                    setIsRegistering(false);
                    setStudentId('');
                    setPhoneNumber('');
                    setPassword('');
                    setError('');
                  }}
                  className="w-full mt-2 text-blue-600 hover:text-blue-700"
                >
                  Back to Login
                </button>
              </>
            ) : (
              // LOGIN FORM
              <>
                <h2 className="text-2xl font-bold mb-6 text-center">Login to Your Account</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Student ID (6 digits)</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.slice(0, 6))}
                    maxLength={6}
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
                    onChange={(e) => setPhoneNumber(e.target.value.slice(0, 11))}
                    maxLength={11}
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
                    onChange={(e) => setPassword(e.target.value.slice(0, 8))}
                    maxLength={8}
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
                  onClick={() => {
                    setIsRegistering(true);
                    setStudentId('');
                    setPhoneNumber('');
                    setPassword('');
                    setError('');
                  }}
                  className="w-full mt-2 text-blue-600 hover:text-blue-700"
                >
                  Create New Account
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

            {/* Machine Lock Control */}
            <div className={`rounded-lg shadow-md p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Lock className="w-6 h-6" />
                  Machine Lock Control
                </h2>
              </div>
              
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
                        <button
                          onClick={() => toggleMachineLock(machine.id, 'washer')}
                          className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                            machine.locked
                              ? darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                              : darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {machine.locked ? (
                            <>
                              <Lock className="w-4 h-4" />
                              Locked
                            </>
                          ) : (
                            <>
                              <Unlock className="w-4 h-4" />
                              Unlocked
                            </>
                          )}
                        </button>
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
                        <button
                          onClick={() => toggleMachineLock(machine.id, 'dryer')}
                          className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                            machine.locked
                              ? darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                              : darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {machine.locked ? (
                            <>
                              <Lock className="w-4 h-4" />
                              Locked
                            </>
                          ) : (
                            <>
                              <Unlock className="w-4 h-4" />
                              Unlocked
                            </>
                          )}
                        </button>
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

            {/* Analytics Dashboard */}
            <div className={`rounded-lg shadow-md p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${
                darkMode ? 'text-white' : 'text-gray-800'
              }`}>
                <BarChart3 className="w-6 h-6" />
                Analytics Dashboard
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Total Washes */}
                <div className={`p-4 rounded-lg text-center transition-colors ${
                  darkMode ? 'bg-blue-900' : 'bg-blue-100'
                }`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                    {usageHistory.filter(h => h.machineType === 'washer' && h.status === 'Completed').length}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Total Washer Cycles</p>
                </div>
                
                {/* Total Dryer Cycles */}
                <div className={`p-4 rounded-lg text-center transition-colors ${
                  darkMode ? 'bg-green-900' : 'bg-green-100'
                }`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-green-200' : 'text-green-800'}`}>
                    {usageHistory.filter(h => h.machineType === 'dryer' && h.status === 'Completed').length}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-600'}`}>Total Dryer Cycles</p>
                </div>
                
                {/* Active Machines */}
                <div className={`p-4 rounded-lg text-center transition-colors ${
                  darkMode ? 'bg-purple-900' : 'bg-purple-100'
                }`}>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-purple-200' : 'text-purple-800'}`}>
                    {machines.filter(m => m.status === 'running').length}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>Active Machines</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Washer Usage Breakdown */}
                <div className={`p-4 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className="text-lg font-semibold mb-3">Washer Usage</h3>
                  <div className="space-y-2">
                    {washerModes.map(mode => {
                      const count = usageHistory.filter(h => h.machineType === 'washer' && h.mode === mode.name && h.status === 'Completed').length;
                      return (
                        <div key={mode.name} className="flex justify-between">
                          <span>{mode.name} ({mode.duration}min)</span>
                          <span className="font-semibold">{count} cycles</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Dryer Usage Breakdown */}
                <div className={`p-4 rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className="text-lg font-semibold mb-3">Dryer Usage</h3>
                  <div className="space-y-2">
                    {dryerModes.map(mode => {
                      const count = usageHistory.filter(h => h.machineType === 'dryer' && h.mode === mode.name && h.status === 'Completed').length;
                      return (
                        <div key={mode.name} className="flex justify-between">
                          <span>{mode.name} ({mode.duration}min)</span>
                          <span className="font-semibold">{count} cycles</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Current Machines Status */}
            <div className={`rounded-lg shadow-md p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Current Machines Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {machines.map((machine: Machine) => (
                  <div key={`${machine.type}-${machine.id}`} className={`p-4 rounded-lg border-2 transition-colors ${
                    machine.locked
                      ? darkMode ? 'border-red-600 bg-red-900' : 'border-red-500 bg-red-50'
                      : machine.status === 'available' 
                      ? darkMode ? 'border-green-600 bg-green-900' : 'border-green-500 bg-green-50'
                      : machine.status === 'running'
                      ? darkMode ? 'border-yellow-600 bg-yellow-900' : 'border-yellow-500 bg-yellow-50'
                      : darkMode ? 'border-red-600 bg-red-900' : 'border-red-500 bg-red-50'
                  }`}>
                    <p className={`font-semibold capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>{machine.type} {machine.id}</p>
                    <p className={`text-sm capitalize font-semibold ${
                      machine.locked 
                        ? darkMode ? 'text-red-300' : 'text-red-600'
                        : machine.status === 'available' 
                        ? darkMode ? 'text-green-300' : 'text-green-600'
                        : darkMode ? 'text-yellow-300' : 'text-yellow-600'
                    }`}>
                      {machine.locked ? 'Not Available' : machine.status}
                    </p>
                    {machine.status === 'running' && !machine.locked && (
                      <>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>User: {machine.userStudentId}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Time Left: {formatTime(machine.timeLeft)}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Waitlists (Admin View) */}
            <div className={`rounded-lg shadow-md p-6 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Waiting Lists
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Washer Waitlist */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Washer Waitlist ({waitlists.washers.length})</h3>
                  {waitlists.washers.length === 0 ? (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No students waiting for washers</p>
                  ) : (
                    <div className="space-y-2">
                      {waitlists.washers.map((entry: WaitlistEntry, idx: number) => (
                        <div key={`washer-waitlist-${entry.studentId}-${idx}`} className={`p-3 rounded-lg border transition-colors ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                        }`}>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            Position #{idx + 1}: {entry.studentId}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Phone: {entry.phone}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dryer Waitlist */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dryer Waitlist ({waitlists.dryers.length})</h3>
                  {waitlists.dryers.length === 0 ? (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No students waiting for dryers</p>
                  ) : (
                    <div className="space-y-2">
                      {waitlists.dryers.map((entry: WaitlistEntry, idx: number) => (
                        <div key={`dryer-waitlist-${entry.studentId}-${idx}`} className={`p-3 rounded-lg border transition-colors ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                        }`}>
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            Position #{idx + 1}: {entry.studentId}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Phone: {entry.phone}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                Washer Stats
              </button>
              <button
                onClick={() => setCurrentView('dryer-stats')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currentView === 'dryer-stats'
                    ? 'bg-blue-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Dryer Stats
              </button>
              <button
                onClick={() => {
                  setShowEditProfile(true);
                  setEditProfileStudentId('');
                  setEditProfilePhone('');
                }}
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
                            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone: {machine.userPhone}</p>
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

                        {machine.status === 'pending-collection' && machine.userStudentId === user.studentId && (
                          <>
                            <p className={`text-sm mb-3 font-semibold ${
                              darkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              Washing complete! Your clothes are ready for pickup.
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notifyComingToCollect(machine.id, 'washer');
                              }}
                              className={`w-full mt-2 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              I am coming to collect my clothes
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clothesCollected(machine.id, 'washer');
                              }}
                              className={`w-full mt-2 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              Clothes Collected
                            </button>
                          </>
                        )}

                        {machine.status === 'available' && !machine.locked && (
                          <>
                            <div className="space-y-2 mb-3">
                              {washerModes.map((mode: Mode) => (
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
                            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Phone: {machine.userPhone}</p>
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

                        {machine.status === 'pending-collection' && machine.userStudentId === user.studentId && (
                          <>
                            <p className={`text-sm mb-3 font-semibold ${
                              darkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              Drying complete! Your clothes are ready for pickup.
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notifyComingToCollect(machine.id, 'dryer');
                              }}
                              className={`w-full mt-2 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              I am coming to collect my clothes
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clothesCollected(machine.id, 'dryer');
                              }}
                              className={`w-full mt-2 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                                darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              Clothes Collected
                            </button>
                          </>
                        )}

                        {machine.status === 'available' && !machine.locked && (
                          <>
                            <div className="space-y-2 mb-3">
                              {dryerModes.map((mode: Mode) => (
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
              <div className="space-y-6">
                {/* Usage History Table */}
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
                            <th className={`px-4 py-2 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Spending</th>
                            <th className={`px-4 py-2 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Status</th>
                            <th className={`px-4 py-2 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usageHistory.filter((h: UsageHistory) => h.studentId === user!.studentId).map((record: UsageHistory) => (
                            <tr key={record.id} className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                              <td className={`px-4 py-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{record.machineType} {record.machineId}</td>
                              <td className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.mode}</td>
                              <td className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.duration} min</td>
                              <td className={`px-4 py-2 font-semibold ${
                                record.status === 'cancelled' 
                                  ? darkMode ? 'text-gray-400' : 'text-gray-500'
                                  : darkMode ? 'text-green-400' : 'text-green-600'
                              }`}>
                                {record.status === 'cancelled' ? '-' : `RM${record.spending || 0}`}
                              </td>
                              <td className={`px-4 py-2 font-medium ${
                                record.status === 'cancelled'
                                  ? darkMode ? 'text-red-400' : 'text-red-600'
                                  : darkMode ? 'text-green-400' : 'text-green-600'
                              }`}>
                                {record.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                              </td>
                              <td className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{record.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats View */}
            {currentView === 'stats' && user && (
              <div className="space-y-6">
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

                {/* Washing Pattern Analysis */}
                {(() => {
                  const patternAnalysis = analyzeWashingPatterns();
                  return (
                    <div className={`rounded-lg shadow-md p-6 transition-colors ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        <BarChart3 className="w-6 h-6" />
                        Washing Pattern Analysis
                      </h3>
                      <p className={`text-sm mb-4 p-4 rounded-lg ${
                        darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-900'
                      }`}>
                        {patternAnalysis.description}
                      </p>
                      {patternAnalysis.peakHours.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`p-4 rounded-lg ${
                            darkMode ? 'bg-red-900' : 'bg-red-50'
                          }`}>
                            <p className={`text-sm font-semibold mb-2 ${
                              darkMode ? 'text-red-300' : 'text-red-800'
                            }`}>Peak Hours</p>
                            <div className="space-y-1">
                              {patternAnalysis.peakHours.map((hour) => (
                                <p key={hour} className={`text-lg font-bold ${
                                  darkMode ? 'text-red-400' : 'text-red-600'
                                }`}>
                                  {hour}:00
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg ${
                            darkMode ? 'bg-green-900' : 'bg-green-50'
                          }`}>
                            <p className={`text-sm font-semibold mb-2 ${
                              darkMode ? 'text-green-300' : 'text-green-800'
                            }`}>Suggested Hours</p>
                            <div className="space-y-1">
                              {patternAnalysis.suggestedHours.map((hour) => (
                                <p key={hour} className={`text-lg font-bold ${
                                  darkMode ? 'text-green-400' : 'text-green-600'
                                }`}>
                                  {hour}:00
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Weekly Washer Usage Stats */}
                {(() => {
                  const now = new Date();
                  const dayOfWeek = now.getDay();
                  const startOfWeek = new Date(now);
                  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  startOfWeek.setHours(0, 0, 0, 0);

                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(startOfWeek.getDate() + 6);
                  endOfWeek.setHours(23, 59, 59, 999);

                  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  const dayStats: Record<string, number> = {};
                  days.forEach(day => dayStats[day] = 0);

                  // Count only WASHER usage by day of week (exclude cancelled)
                  usageHistory.forEach((record: UsageHistory) => {
                    if (record.machineType === 'washer' && record.status !== 'cancelled') {
                      const recordDate = new Date(record.timestamp);
                      if (recordDate >= startOfWeek && recordDate <= endOfWeek) {
                        const day = days[recordDate.getDay() === 0 ? 6 : recordDate.getDay() - 1];
                        dayStats[day]++;
                      }
                    }
                  });

                  const totalUsage = Object.values(dayStats).reduce((a, b) => a + b, 0);
                  const avgUsage = totalUsage > 0 ? Math.round(totalUsage / 7) : 0;
                  const peakDay = Object.entries(dayStats).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

                  return (
                    <div className={`rounded-lg shadow-md p-6 transition-colors ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        <BarChart3 className="w-6 h-6" />
                        Weekly Washers Usage
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className={`p-4 rounded-lg text-center ${
                          darkMode ? 'bg-blue-900' : 'bg-blue-50'
                        }`}>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-blue-300' : 'text-blue-800'
                          }`}>Total Uses This Week</p>
                          <p className={`text-3xl font-bold ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>{totalUsage}</p>
                        </div>
                        <div className={`p-4 rounded-lg text-center ${
                          darkMode ? 'bg-purple-900' : 'bg-purple-50'
                        }`}>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-purple-300' : 'text-purple-800'
                          }`}>Peak Day</p>
                          <p className={`text-2xl font-bold ${
                            darkMode ? 'text-purple-400' : 'text-purple-600'
                          }`}>{peakDay}</p>
                        </div>
                        <div className={`p-4 rounded-lg text-center ${
                          darkMode ? 'bg-indigo-900' : 'bg-indigo-50'
                        }`}>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-indigo-300' : 'text-indigo-800'
                          }`}>Daily Average</p>
                          <p className={`text-3xl font-bold ${
                            darkMode ? 'text-indigo-400' : 'text-indigo-600'
                          }`}>{avgUsage}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {days.map((day) => {
                          const count = dayStats[day] || 0;
                          const maxCount = Math.max(...Object.values(dayStats));
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={day} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{day}</span>
                                <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{count} uses</span>
                              </div>
                              <div className={`w-full h-6 rounded-lg overflow-hidden ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}>
                                <div
                                  className={`h-full transition-all ${
                                    darkMode ? 'bg-blue-600' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Critical Issues Alert */}
                {(() => {
                  const criticalIssues = getCriticalIssues();
                  return criticalIssues.length > 0 ? (
                    <div className={`rounded-lg shadow-md p-6 transition-colors border-l-4 ${
                      darkMode ? 'bg-red-900 border-red-600' : 'bg-red-50 border-red-500'
                    }`}>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                        darkMode ? 'text-red-300' : 'text-red-800'
                      }`}>
                        <AlertCircle className="w-6 h-6" />
                        ⚠️ Critical Issues Detected
                      </h3>
                      <div className="space-y-3">
                        {criticalIssues.map((issue, idx) => (
                          <div key={idx} className={`p-3 rounded ${
                            darkMode ? 'bg-red-800' : 'bg-red-100'
                          }`}>
                            <p className={`font-semibold ${
                              darkMode ? 'text-red-200' : 'text-red-900'
                            }`}>
                              {issue.machineType.charAt(0).toUpperCase() + issue.machineType.slice(1)} #{issue.machineId} ({issue.reportCount} reports)
                            </p>
                            <p className={`text-sm mt-1 ${
                              darkMode ? 'text-red-300' : 'text-red-800'
                            }`}>
                              {issue.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Dryer Stats View */}
            {currentView === 'dryer-stats' && user && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`rounded-lg shadow-md p-6 text-center transition-colors ${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <Waves className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Dry Cycles</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.machineType === 'dryer').length}
                    </p>
                  </div>
                  <div className={`rounded-lg shadow-md p-6 text-center transition-colors ${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <Clock className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-green-400' : 'text-green-500'}`} />
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Minutes</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.machineType === 'dryer').reduce((sum, h) => sum + h.duration, 0)}
                    </p>
                  </div>
                  <div className={`rounded-lg shadow-md p-6 text-center transition-colors ${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg. Duration</p>
                    <p className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.machineType === 'dryer').length > 0 
                        ? Math.round(usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.machineType === 'dryer').reduce((sum, h) => sum + h.duration, 0) / usageHistory.filter((h: UsageHistory) => h.studentId === user.studentId && h.machineType === 'dryer').length)
                        : 0}m
                    </p>
                  </div>
                </div>

                {/* Drying Pattern Analysis */}
                {(() => {
                  const patternAnalysis = analyzeDryingPatterns();
                  return (
                    <div className={`rounded-lg shadow-md p-6 transition-colors ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        <BarChart3 className="w-6 h-6" />
                        Drying Pattern Analysis
                      </h3>
                      <p className={`text-sm mb-4 p-4 rounded-lg ${
                        darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-900'
                      }`}>
                        {patternAnalysis.description}
                      </p>
                      {patternAnalysis.peakHours.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`p-4 rounded-lg ${
                            darkMode ? 'bg-red-900' : 'bg-red-50'
                          }`}>
                            <p className={`text-sm font-semibold mb-2 ${
                              darkMode ? 'text-red-300' : 'text-red-800'
                            }`}>Peak Hours</p>
                            <div className="space-y-1">
                              {patternAnalysis.peakHours.map((hour) => (
                                <p key={hour} className={`text-lg font-bold ${
                                  darkMode ? 'text-red-400' : 'text-red-600'
                                }`}>
                                  {hour}:00
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg ${
                            darkMode ? 'bg-green-900' : 'bg-green-50'
                          }`}>
                            <p className={`text-sm font-semibold mb-2 ${
                              darkMode ? 'text-green-300' : 'text-green-800'
                            }`}>Suggested Hours</p>
                            <div className="space-y-1">
                              {patternAnalysis.suggestedHours.map((hour) => (
                                <p key={hour} className={`text-lg font-bold ${
                                  darkMode ? 'text-green-400' : 'text-green-600'
                                }`}>
                                  {hour}:00
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Weekly Dryer Usage Stats */}
                {(() => {
                  // Compute stats specifically for dryers
                  const now = new Date();
                  const dayOfWeek = now.getDay();
                  const startOfWeek = new Date(now);
                  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                  startOfWeek.setHours(0, 0, 0, 0);

                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(startOfWeek.getDate() + 6);
                  endOfWeek.setHours(23, 59, 59, 999);

                  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  const dayStats: Record<string, number> = {};
                  days.forEach(day => dayStats[day] = 0);

                  usageHistory.forEach((record: UsageHistory) => {
                    if (record.machineType === 'dryer' && record.status !== 'cancelled') {
                      const recordDate = new Date(record.timestamp);
                      if (recordDate >= startOfWeek && recordDate <= endOfWeek) {
                        const day = days[recordDate.getDay() === 0 ? 6 : recordDate.getDay() - 1];
                        dayStats[day]++;
                      }
                    }
                  });

                  const totalUsage = Object.values(dayStats).reduce((a, b) => a + b, 0);
                  const avgUsage = totalUsage > 0 ? Math.round(totalUsage / 7) : 0;
                  const peakDay = Object.entries(dayStats).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

                  return (
                    <div className={`rounded-lg shadow-md p-6 transition-colors ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}>
                        <BarChart3 className="w-6 h-6" />
                        Weekly Dryer Usage
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className={`p-4 rounded-lg text-center ${
                          darkMode ? 'bg-blue-900' : 'bg-blue-50'
                        }`}>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-blue-300' : 'text-blue-800'
                          }`}>Total Uses This Week</p>
                          <p className={`text-3xl font-bold ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>{totalUsage}</p>
                        </div>
                        <div className={`p-4 rounded-lg text-center ${
                          darkMode ? 'bg-purple-900' : 'bg-purple-50'
                        }`}>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-purple-300' : 'text-purple-800'
                          }`}>Peak Day</p>
                          <p className={`text-2xl font-bold ${
                            darkMode ? 'text-purple-400' : 'text-purple-600'
                          }`}>{peakDay}</p>
                        </div>
                        <div className={`p-4 rounded-lg text-center ${
                          darkMode ? 'bg-indigo-900' : 'bg-indigo-50'
                        }`}>
                          <p className={`text-sm font-semibold ${
                            darkMode ? 'text-indigo-300' : 'text-indigo-800'
                          }`}>Daily Average</p>
                          <p className={`text-3xl font-bold ${
                            darkMode ? 'text-indigo-400' : 'text-indigo-600'
                          }`}>{avgUsage}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {days.map((day) => {
                          const count = dayStats[day] || 0;
                          const maxCount = Math.max(...Object.values(dayStats));
                          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                          return (
                            <div key={day} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{day}</span>
                                <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{count} uses</span>
                              </div>
                              <div className={`w-full h-6 rounded-lg overflow-hidden ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}>
                                <div
                                  className={`h-full transition-all ${
                                    darkMode ? 'bg-purple-600' : 'bg-purple-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
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
                  value={editProfileStudentId || user.studentId}
                  onChange={(e) => setEditProfileStudentId(e.target.value)}
                  placeholder="Enter new student ID"
                  className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' : 'bg-white text-black border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number</label>
                <input
                  type="text"
                  value={editProfilePhone}
                  onChange={(e) => setEditProfilePhone(e.target.value)}
                  placeholder="Enter new phone number (10-11 digits)"
                  className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' : 'bg-white text-black border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                <input
                  type="password"
                  value={editProfilePassword}
                  onChange={(e) => setEditProfilePassword(e.target.value)}
                  placeholder="Enter new password (8 digits)"
                  className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' : 'bg-white text-black border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
                <input
                  type="password"
                  value={editProfilePasswordConfirm}
                  onChange={(e) => setEditProfilePasswordConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full px-4 py-2 border rounded-lg transition-colors ${
                    darkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' : 'bg-white text-black border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <button
                onClick={() => {
                  if (editProfilePhone && !validatePhone(editProfilePhone)) {
                    setError('Phone must be 10-11 digits');
                    return;
                  }
                  if (editProfilePassword && !validatePassword(editProfilePassword)) {
                    setError('Password must be 8 digits');
                    return;
                  }
                  if (editProfilePassword !== editProfilePasswordConfirm) {
                    setError('Passwords do not match');
                    return;
                  }
                  
                  // Update user profile
                  if (editProfileStudentId) {
                    setUser({ ...user, studentId: editProfileStudentId });
                  }
                  if (editProfilePhone) {
                    setUser((prevUser) => prevUser ? { ...prevUser, phoneNumber: editProfilePhone } : prevUser);
                  }
                  
                  showNotification('Profile updated successfully!');
                  setShowEditProfile(false);
                  setEditProfileStudentId('');
                  setEditProfilePhone('');
                  setEditProfilePassword('');
                  setEditProfilePasswordConfirm('');
                  setError('');
                }}
                className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                  darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditProfile(false);
                  setEditProfileStudentId('');
                  setEditProfilePhone('');
                  setEditProfilePassword('');
                  setEditProfilePasswordConfirm('');
                  setError('');
                }}
                className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYWashSystem;
