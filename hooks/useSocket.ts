import { useEffect, useRef, useCallback, useState } from 'react';

interface AppState {
  machines: any[];
  waitlists: any;
  reportedIssues: any[];
  usageHistory: any[];
  stats: any;
}

export const useSocket = () => {
  const [state, setState] = useState<AppState | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const response = await fetch('/api/state');
      if (response.ok) {
        const data = await response.json();
        setState(data);
      }
    } catch (error) {
      console.error('Failed to fetch state:', error);
    }
  }, []);

  const emit = useCallback(
    async (event: string, data?: any) => {
      try {
        const response = await fetch('/api/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ event, data }),
        });

        if (response.ok) {
          const newState = await response.json();
          if (newState.state) {
            setState(newState.state);
          }
        }
      } catch (error) {
        console.error(`Failed to emit ${event}:`, error);
      }
    },
    []
  );

  const startPolling = useCallback(() => {
    // Fetch state immediately
    fetchState();

    // Then poll every 1 second
    pollingIntervalRef.current = setInterval(() => {
      fetchState();
    }, 1000);
  }, [fetchState]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  }, []);

  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return {
    state,
    emit,
    isConnected: state !== null,
  };
};

