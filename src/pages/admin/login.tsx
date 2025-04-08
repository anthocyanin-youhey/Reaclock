//reaclock\src\pages\admin\login.tsx
import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [employeeNumber, setEmployeeNumber] = useState(""); // 社員番号
  const [password, setPassword] = useState(""); // パスワード
  const [errorMessage, setErrorMessage] = useState(""); // エラーメッセージ
  const [isLoading, setIsLoading] = useState(false); // ローディング状態
  const router = useRouter(); // ルーター

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
        // ログイン成功
        setErrorMessage("");
        setIsLoading(true); // ローディング開始
        setTimeout(() => {
          router.push("/admin/dashboard"); // 少し遅らせて遷移
        }, 1000);
      } else {
        // ログイン失敗時のエラーハンドリング
        if (data.error === "Unauthorized") {
          setErrorMessage("この画面には管理者権限が必要です。");
        } else if (data.error === "Invalid credentials") {
          setErrorMessage("社員番号またはパスワードが間違っています。");
        } else {
          setErrorMessage(data.error || "ログインに失敗しました。");
        }
      }
    } catch (error) {
      console.error("ログイン中のエラー:", error);
      setErrorMessage("ネットワークエラーが発生しました。");
    }
  };

  // ローディング画面表示
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
          <p className="text-gray-700 text-lg font-semibold">
            ダッシュボードに移動中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="w-full max-w-sm p-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">管理者ログイン</h1>
        <h5 className=" text-center">※レイアウトの関係からPCでの利用推奨</h5>
        <h5 className=" text-center">（鋭意修正中...）</h5>
        <br />
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
