// src/components/AdminLayout.tsx

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useLateCount } from "../context/LateCountContext"; // 遅刻件数を取得するためのコンテキスト

export default function AdminLayout({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName?: string;
}) {
  const router = useRouter();
  const [logoutMessage, setLogoutMessage] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false); // ハンバーガーメニューの開閉状態
  const [fetchedAdminName, setFetchedAdminName] = useState<string>("");

  // 未対応遅刻件数を取得するコンテキスト
  const { lateCount } = useLateCount();

  // APIから管理者名を取得（バックアップ用）
  useEffect(() => {
    if (!adminName) {
      const fetchAdminName = async () => {
        try {
          const response = await fetch("/api/admin/getAdminInfo");
          const data = await response.json();
          if (response.ok) {
            setFetchedAdminName(data.name || "管理者");
          } else {
            console.error("管理者名の取得に失敗しました");
          }
        } catch (error) {
          console.error("管理者名取得エラー:", error);
        }
      };
      fetchAdminName();
    }
  }, [adminName]);

  // ログアウト処理
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });

      if (response.ok) {
        setLogoutMessage("ログアウトしました！");
        setTimeout(() => {
          router.push("/admin/login");
        }, 1500);
      } else {
        setLogoutMessage("ログアウトに失敗しました。");
      }
    } catch (error) {
      console.error("ログアウト処理中にエラーが発生しました:", error);
      setLogoutMessage("ログアウトに失敗しました。");
    }
  };

  const displayedAdminName = adminName || fetchedAdminName;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-blue-500 text-white relative">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          {/* タイトル */}
          <h1 className="text-xl font-bold">管理者ダッシュボード</h1>

          {/* ナビゲーション（デスクトップ） */}
          <nav className="hidden md:flex space-x-4 items-center">
            <Link href="/admin/dashboard">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                ホーム
              </span>
            </Link>
            <Link href="/admin/createStaff">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                スタッフ新規登録
              </span>
            </Link>
            <Link href="/admin/staffList">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                スタッフ一覧
              </span>
            </Link>
            <Link href="/admin/attendanceRecords">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer">
                打刻履歴
              </span>
            </Link>
            <Link href="/admin/attendanceStatus">
              <span className="block py-2 px-4 rounded text-sm hover:bg-blue-600 cursor-pointer flex items-center">
                出欠/遅刻管理
                {lateCount > 0 && (
                  <span className="ml-2 text-yellow-500 font-bold">
                    ⚠ 未対応{lateCount}件
                  </span>
                )}
              </span>
            </Link>
          </nav>

          {/* ログイン中の管理者名とログアウトボタン */}
          <div className="hidden md:flex items-center space-x-4">
            <p className="text-sm font-light">
              {displayedAdminName} さんでログイン中
            </p>
            <button
              onClick={handleLogout}
              className="py-2 px-4 rounded border border-red-500 bg-red-500 text-white text-sm hover:bg-white hover:text-red-500 transition-all"
            >
              ログアウト
            </button>
          </div>

          {/* ハンバーガーメニュー */}
          <button
            className="block md:hidden text-white focus:outline-none z-50"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>

        {/* モバイルメニュー */}
        <nav
          className={`fixed top-0 right-0 h-full bg-blue-600 text-white w-64 transform ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          } transition-transform duration-300 ease-in-out z-40`}
        >
          <button
            className="absolute top-4 right-4 text-white text-xl focus:outline-none"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
          <ul className="mt-16 space-y-4 px-6">
            <li>
              <Link
                href="/admin/dashboard"
                className="block py-2 px-4 rounded hover:bg-blue-700 cursor-pointer"
              >
                ホーム
              </Link>
            </li>
            <li>
              <Link
                href="/admin/createStaff"
                className="block py-2 px-4 rounded hover:bg-blue-700 cursor-pointer"
              >
                スタッフ新規登録
              </Link>
            </li>
            <li>
              <Link
                href="/admin/staffList"
                className="block py-2 px-4 rounded hover:bg-blue-700 cursor-pointer"
              >
                スタッフ一覧
              </Link>
            </li>
            <li>
              <Link
                href="/admin/attendanceRecords"
                className="block py-2 px-4 rounded hover:bg-blue-700 cursor-pointer"
              >
                打刻履歴
              </Link>
            </li>
            <li>
              <Link
                href="/admin/attendanceStatus"
                className="block py-2 px-4 rounded hover:bg-blue-700 cursor-pointer flex items-center"
              >
                出欠/遅刻管理
                {lateCount > 0 && (
                  <span className="ml-2 text-yellow-500 font-bold">
                    ⚠ 遅刻者未対応{lateCount}件
                  </span>
                )}
              </Link>
            </li>
            <li className="mt-10">
              <button
                onClick={handleLogout}
                className="block w-full py-2 px-4 rounded border border-red-500 bg-red-500 text-white text-sm hover:bg-white hover:text-red-500 transition-all"
              >
                ログアウト
              </button>
            </li>
          </ul>
        </nav>
      </header>

      {logoutMessage && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded shadow">
          {logoutMessage}
        </div>
      )}

      <main className="flex-grow container mx-auto px-6 py-4">{children}</main>

      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 打刻アプリ - 管理者専用</p>
        </div>
      </footer>
    </div>
  );
}
