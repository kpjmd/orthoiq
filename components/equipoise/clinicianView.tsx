'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Patient-readable by default; "clinician view" reveals evidenceGrade /
// populationMatch / confidence / PMIDs. Page-level, persisted to localStorage.
const STORAGE_KEY = 'orthoiq:clinicianView';

interface ClinicianViewValue {
  clinicianView: boolean;
  setClinicianView: (on: boolean) => void;
  toggle: () => void;
}

const ClinicianViewContext = createContext<ClinicianViewValue>({
  clinicianView: false,
  setClinicianView: () => {},
  toggle: () => {},
});

export function ClinicianViewProvider({ children }: { children: ReactNode }) {
  const [clinicianView, setClinicianViewState] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setClinicianViewState(true);
    } catch {
      // localStorage unavailable (private mode / SSR) — keep default.
    }
  }, []);

  const setClinicianView = useCallback((on: boolean) => {
    setClinicianViewState(on);
    try {
      localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
    } catch {
      // best-effort persistence
    }
  }, []);

  const toggle = useCallback(() => setClinicianView(!clinicianView), [clinicianView, setClinicianView]);

  return (
    <ClinicianViewContext.Provider value={{ clinicianView, setClinicianView, toggle }}>
      {children}
    </ClinicianViewContext.Provider>
  );
}

export function useClinicianView() {
  return useContext(ClinicianViewContext);
}
