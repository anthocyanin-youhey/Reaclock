// src/pages/admin/login.tsx
import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  // ログイン処理
  const handleLogin = async () => {
    if (!employeeNumber || !password) {
      setErrorMessage("社員番号とパスワードを入力してください。");
      return;
    }

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_number: employeeNumber, password }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("ログイン成功！データ:", data); // 成功時のログ
        setErrorMessage("");
        router.push("/admin/dashboard"); // ダッシュボードに遷移
      } else {
        setErrorMessage(data.error || "ログインに失敗しました。");
        console.log("ログイン失敗。エラー内容:", data.error);
      }
    } catch (error) {
      console.error("ログイン中のエラー:", error);
      setErrorMessage("ネットワークエラーが発生しました。");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-sm p-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">管理者ログイン</h1>
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
          className="w-full py-2 mt-4 text-white bg-blue-500 hover:bg-blue-600 rounded"
        >
          ログイン
        </button>
      </div>
    </div>
  );
}
