// src/context/LateCountContext.tsx

import React, { createContext, useContext, useState, ReactNode } from "react";

// Contextの型定義
type LateCountContextType = {
  lateCount: number;
  setLateCount: (count: number) => void;
};

// Contextの初期値
const LateCountContext = createContext<LateCountContextType | undefined>(
  undefined
);

// Providerコンポーネント
export const LateCountProvider = ({ children }: { children: ReactNode }) => {
  const [lateCount, setLateCount] = useState<number>(0);

  return (
    <LateCountContext.Provider value={{ lateCount, setLateCount }}>
      {children}
    </LateCountContext.Provider>
  );
};

// Contextを利用するためのカスタムフック
export const useLateCount = () => {
  const context = useContext(LateCountContext);
  if (!context) {
    throw new Error("useLateCount must be used within a LateCountProvider");
  }
  return context;
};
