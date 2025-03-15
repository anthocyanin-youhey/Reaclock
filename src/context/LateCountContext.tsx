// src/context/LateCountContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

/**
 * 遅刻件数を管理するための Context で利用する型定義
 */
type LateCountContextType = {
  lateCount: number;
  /**
   * React の setState と同様に、
   *   setLateCount(数値)
   *  または
   *   setLateCount((prevCount) => prevCount + 1)
   * といった使い方が可能になるようにする
   */
  setLateCount: Dispatch<SetStateAction<number>>;
};

/**
 * Context の初期値は undefined にしておき、
 * 実際に Provider を使わずに利用しようとした場合はエラーを投げる
 */
const LateCountContext = createContext<LateCountContextType | undefined>(
  undefined
);

/**
 * 遅刻件数を提供するコンポーネント
 */
export const LateCountProvider = ({ children }: { children: ReactNode }) => {
  const [lateCount, setLateCount] = useState<number>(0);

  return (
    <LateCountContext.Provider value={{ lateCount, setLateCount }}>
      {children}
    </LateCountContext.Provider>
  );
};

/**
 * 遅刻件数を利用するためのカスタムフック
 */
export const useLateCount = () => {
  const context = useContext(LateCountContext);
  if (!context) {
    throw new Error("useLateCount must be used within a LateCountProvider");
  }
  return context;
};
