// src/components/UserLayout.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

export default function UserLayout({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false); // ハンバーガーメニューの開閉状態

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/user/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // ログイン画面にリダイレクト
        router.push("/user/login");
      } else {
        console.error("ログアウトに失敗しました");
      }
    } catch (error) {
      console.error("エラー:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー部分 */}
      <header className="bg-green-500 text-white">
        <div className="container mx-auto flex justify-between items-center py-4 px-6">
          <h1 className="text-xl font-bold">利用者画面</h1>

          {/* ハンバーガーメニュー */}
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

          {/* ナビゲーションメニュー */}
          <nav
            className={`${
              menuOpen ? "block" : "hidden"
            } md:flex space-x-4 items-center`}
          >
            <Link href="/user/clock" className="hover:underline">
              打刻
            </Link>
            <Link href="/user/attendance" className="hover:underline">
              履歴
            </Link>
            <button
              onClick={handleLogout}
              className="hover:underline text-white bg-transparent border-none cursor-pointer"
            >
              ログアウト
            </button>
          </nav>

          {userName && (
            <p className="hidden md:block text-sm font-light ml-4">
              {userName} さんでログイン中
            </p>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow container mx-auto px-6 py-4">{children}</main>

      {/* フッター部分 */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto text-center">
          <p>&copy; 2024 利用者画面</p>
        </div>
      </footer>
    </div>
  );
}
