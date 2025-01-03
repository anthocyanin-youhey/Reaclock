// src/pages/user/login.tsx

import { useState } from "react"; // 状態管理
import { useRouter } from "next/router"; // ルーティング

export default function UserLogin() {
  const [employeeNumber, setEmployeeNumber] = useState(""); // 入力された社員番号
  const [password, setPassword] = useState(""); // 入力されたパスワード
  const [errorMessage, setErrorMessage] = useState(""); // エラーメッセージ
  const router = useRouter(); // ルーター

  // ログインボタン押下時の処理
  const handleLogin = async () => {
    if (!employeeNumber || !password) {
      setErrorMessage("社員番号とパスワードを入力してください。");
      return;
    }

    try {
      // APIを呼び出してログイン認証
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_number: employeeNumber, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setErrorMessage(""); // エラーをリセット
        alert("ログイン成功！"); // 成功メッセージ
        router.push("/user/clock"); // 打刻ページに遷移
      } else {
        setErrorMessage(data.error || "ログインに失敗しました。");
      }
    } catch (error) {
      console.error("ログインエラー:", error);
      setErrorMessage("ネットワークエラーが発生しました。");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-sm p-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">利用者ログイン</h1>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-bold text-gray-700">
            社員番号
          </label>
          <input
            type="text"
            placeholder="社員番号"
            className="w-full px-4 py-2 border rounded"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 text-sm font-bold text-gray-700">
            パスワード
          </label>
          <input
            type="password"
            placeholder="パスワード"
            className="w-full px-4 py-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        <button
          onClick={handleLogin}
          className="w-full py-2 text-white bg-blue-500 hover:bg-blue-600 rounded mb-4"
        >
          ログイン
        </button>
        <button
          onClick={() => router.push("/")}
          className="w-full py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded"
        >
          戻る
        </button>
      </div>
    </div>
  );
}
