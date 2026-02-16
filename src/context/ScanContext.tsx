import React, { createContext, useContext, useState, useCallback } from 'react';

export type WorryType = 'sugar' | 'fat' | 'protein' | 'calories' | 'diet';

export interface ScanState {
  worryType: WorryType | null;
  selectedClaim: string | null;
  labelImageUris: string[];
  labelText: string[];
  selectedClaims: string[];
  foodCategory?: string;
}

interface ScanContextType extends ScanState {
  setWorryType: (worry: WorryType | null) => void;
  setSelectedClaim: (claim: string | null) => void;
  setLabelImageUris: (uris: string[]) => void;
  addLabelImage: (uri: string) => void;
  removeLabelImage: (index: number) => void;
  setLabelText: (text: string[]) => void;
  setSelectedClaims: (claims: string[]) => void;
  setFoodCategory: (category?: string) => void;
  resetScan: () => void;
}

const initialState: ScanState = {
  worryType: null,
  selectedClaim: null,
  labelImageUris: [],
  labelText: [],
  selectedClaims: [],
};

const ScanContext = createContext<ScanContextType | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ScanState>(initialState);

  const setWorryType = useCallback((worry: WorryType | null) => {
    setState((s) => ({ ...s, worryType: worry }));
  }, []);

  const setSelectedClaim = useCallback((claim: string | null) => {
    setState((s) => ({ ...s, selectedClaim: claim }));
  }, []);

  const setLabelImageUris = useCallback((uris: string[]) => {
    setState((s) => ({ ...s, labelImageUris: uris }));
  }, []);

  const addLabelImage = useCallback((uri: string) => {
    setState((s) => ({
      ...s,
      labelImageUris: s.labelImageUris.length < 5 ? [...s.labelImageUris, uri] : s.labelImageUris,
    }));
  }, []);

  const removeLabelImage = useCallback((index: number) => {
    setState((s) => ({
      ...s,
      labelImageUris: s.labelImageUris.filter((_, i) => i !== index),
    }));
  }, []);

  const setLabelText = useCallback((text: string[]) => {
    setState((s) => ({ ...s, labelText: text }));
  }, []);

  const setSelectedClaims = useCallback((claims: string[]) => {
    setState((s) => ({ ...s, selectedClaims: claims }));
  }, []);

  const setFoodCategory = useCallback((category?: string) => {
    setState((s) => ({ ...s, foodCategory: category }));
  }, []);

  const resetScan = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <ScanContext.Provider
      value={{
        ...state,
        setWorryType,
        setSelectedClaim,
        setLabelImageUris,
        addLabelImage,
        removeLabelImage,
        setLabelText,
        setSelectedClaims,
        setFoodCategory,
        resetScan,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
