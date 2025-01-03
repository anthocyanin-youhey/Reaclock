// src/pages/admin/editProfile.tsx

import { useState } from "react";
import { requireAdminAuth } from "../../utils/authHelpers"; // 管理者認証

// 認証を追加
export const getServerSideProps = requireAdminAuth;

export default function EditProfile() {
  const [name, setName] = useState(""); // 名前を管理
  const [email, setEmail] = useState(""); // メールアドレスを管理

  // スタッフ情報の更新処理
  const handleUpdate = () => {
    alert(`スタッフ情報を更新しました: 名前=${name}, メール=${email}`);
    setName(""); // 入力欄をリセット
    setEmail(""); // 入力欄をリセット
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">スタッフ情報編集</h1>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-3 border rounded"
        />
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 border rounded"
        />
        <button
          onClick={handleUpdate}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          更新
        </button>
      </div>
    </div>
  );
}
