import { useEffect, useRef } from 'react';
import { onValue, ref } from 'firebase/database';
import { auth, rtdb } from '../firebase';

export type RtdbSyncVisualState = 'idle' | 'syncing' | 'synced' | 'error';

export function shouldTriggerSyncCallback(
  previousTick: number,
  currentTick: number
): boolean {
  return currentTick > 0 && currentTick !== previousTick;
}

export interface UseSyncEffectOptions {
  /** Monotonically incremented counter whenever RTDB data changes */
  syncTick?: number;
  /** Optional Realtime Database path to listen on directly when Firebase Auth is verified */
  rtdbPath?: string;
  /** Callback executed to refresh component-local draft/derived states on live RTDB updates */
  onSync: (meta: { source: 'tick' | 'rtdb_listener'; tick: number }) => void;
  /** Disable subscription when panel is inactive */
  enabled?: boolean;
}

/**
 * React hook that triggers a state refresh or re-sync callback whenever
 * Firebase Realtime Database updates are detected either via the app-wide
 * live sync tick or a direct RTDB path listener.
 */
export function useSyncEffect({
  syncTick = 0,
  rtdbPath,
  onSync,
  enabled = true,
}: UseSyncEffectOptions): void {
  const prevTickRef = useRef<number>(syncTick);
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!enabled) return;
    if (shouldTriggerSyncCallback(prevTickRef.current, syncTick)) {
      prevTickRef.current = syncTick;
      onSyncRef.current({ source: 'tick', tick: syncTick });
    } else {
      prevTickRef.current = syncTick;
    }
  }, [enabled, syncTick]);

  useEffect(() => {
    if (!enabled || !rtdbPath || !auth.currentUser?.emailVerified) {
      return;
    }

    let isFirstEmission = true;
    const targetRef = ref(rtdb, rtdbPath);
    const unsubscribe = onValue(
      targetRef,
      (snapshot) => {
        if (isFirstEmission) {
          isFirstEmission = false;
          return;
        }
        if (snapshot.exists()) {
          onSyncRef.current({ source: 'rtdb_listener', tick: prevTickRef.current + 1 });
        }
      },
      () => {
        // Non-fatal fallback: app-level syncTick still keeps state updated
      }
    );

    return () => {
      unsubscribe();
    };
  }, [enabled, rtdbPath]);
}
