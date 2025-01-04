// src/components/AdminLayout.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function AdminLayout({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName?: string; // 管理者名（オプション）
}) {
  const router = useRouter();
  const [logoutMessage, setLogoutMessage] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false); // ハンバーガーメニューの開閉状態
  const [fetchedAdminName, setFetchedAdminName] = useState<string>("");

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
      <header className="bg-blue-500 text-white">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <h1 className="text-xl font-bold">管理者ダッシュボード</h1>

          <button
            className="block md:hidden text-white focus:outline-none"
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

          <nav
            className={`${
              menuOpen ? "block" : "hidden"
            } md:flex space-x-4 items-center`}
          >
            <Link href="/admin/dashboard">
              <span className="hover:underline cursor-pointer">ホーム</span>
            </Link>
            <Link href="/admin/createStaff">
              <span className="hover:underline cursor-pointer">
                スタッフ新規登録
              </span>
            </Link>
            <Link href="/admin/staffList">
              <span className="hover:underline cursor-pointer">
                スタッフ一覧
              </span>
            </Link>
            <Link href="/admin/attendanceRecords">
              <span className="hover:underline cursor-pointer">打刻履歴</span>
            </Link>
            <button
              onClick={handleLogout}
              className="hover:underline text-white bg-transparent border-none cursor-pointer"
            >
              ログアウト
            </button>
          </nav>

          <p className="hidden md:block text-sm font-light ml-4">
            {displayedAdminName} さんでログイン中
          </p>
        </div>
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
