// src/pages/admin/editAttendance.tsx

import { useState } from "react";
import { requireAdminAuth } from "../../utils/authHelpers"; // 管理者認証

// 認証を追加
export const getServerSideProps = requireAdminAuth;

export default function EditAttendance() {
  const [attendance, setAttendance] = useState(""); // 勤怠情報を管理

  // 勤怠情報の更新処理
  const handleUpdate = () => {
    alert(`勤怠情報を更新しました: ${attendance}`);
    setAttendance(""); // 入力欄をリセット
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">勤怠編集</h1>
      <textarea
        placeholder="勤怠情報を入力"
        value={attendance}
        onChange={(e) => setAttendance(e.target.value)}
        className="w-full max-w-lg p-3 border rounded"
      />
      <button
        onClick={handleUpdate}
        className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        更新
      </button>
    </div>
  );
}
