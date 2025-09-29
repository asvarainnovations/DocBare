"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ProductMode = 'pleadsmart' | 'docbare';

interface ProductModeContextType {
  mode: ProductMode;
  setMode: (mode: ProductMode) => void;
  toggleMode: () => void;
  isDocBareMode: boolean;
}

const ProductModeContext = createContext<ProductModeContextType | undefined>(undefined);

interface ProductModeProviderProps {
  children: ReactNode;
}

export function ProductModeProvider({ children }: ProductModeProviderProps) {
  const [mode, setModeState] = useState<ProductMode>('pleadsmart'); // Default to PleadSmart
  

  // Load mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('productMode') as ProductMode;
    if (savedMode && (savedMode === 'pleadsmart' || savedMode === 'docbare')) {
      setModeState(savedMode);
    }
  }, []);

  // Save mode to localStorage when it changes
  const setMode = (newMode: ProductMode) => {
    setModeState(newMode);
    localStorage.setItem('productMode', newMode);
  };

  const toggleMode = () => {
    const newMode = mode === 'pleadsmart' ? 'docbare' : 'pleadsmart';
    setMode(newMode);
  };

  const isDocBareMode = mode === 'docbare';

  return (
    <ProductModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isDocBareMode,
      }}
    >
      {children}
    </ProductModeContext.Provider>
  );
}

export function useProductMode() {
  const context = useContext(ProductModeContext);
  if (context === undefined) {
    throw new Error('useProductMode must be used within a ProductModeProvider');
  }
  return context;
}
