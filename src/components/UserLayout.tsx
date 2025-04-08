//UserLayout.tsx
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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/user/logout", { method: "POST" });
      if (res.ok) {
        router.push("/user/login");
      } else {
        console.error("ログアウト失敗");
      }
    } catch (err) {
      console.error("エラー:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white shadow fixed top-0 left-0 right-0 z-50 border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex justify-between items-center">
          <Link href="/user/clock">
            <span className="text-2xl font-semibold tracking-wide text-gray-800 cursor-pointer">
              Lua<span className="text-green-600">9311</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex space-x-10 text-sm">
            {navItems.map(({ href, title, subtitle }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center cursor-pointer"
              >
                <span className="text-gray-700 group-hover:text-green-600">
                  {title}
                </span>
                <span className="text-xs text-gray-400 group-hover:text-green-600">
                  {subtitle}
                </span>
                <span className="w-5 h-[2px] bg-green-600 mt-1 opacity-0 group-hover:opacity-100 transition-all" />
              </Link>
            ))}
            <div className="flex items-center space-x-3 ml-6">
              <span className="text-sm text-gray-500">{userName} さん</span>
              <button
                onClick={handleLogout}
                className="text-white bg-red-500 hover:bg-red-600 text-xs px-3 py-1 rounded"
              >
                ログアウト
              </button>
            </div>
          </nav>

          {/* Hamburger menu */}
          <button
            className="xl:hidden text-gray-700 focus:outline-none"
            onClick={() => setMenuOpen(true)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide Menu */}
      <aside
        className={`fixed top-0 right-0 w-64 h-full bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-lg ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-green-600 font-semibold text-sm">
              {userName} さん
            </p>
            <button onClick={() => setMenuOpen(false)}>
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {navItems.map(({ href, title, subtitle }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block border-b pb-2"
            >
              <div className="font-semibold text-gray-700">{title}</div>
              <div className="text-xs text-gray-500">{subtitle}</div>
            </Link>
          ))}

          <button
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="mt-6 bg-red-500 text-white py-2 w-full rounded hover:bg-red-600 transition"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-grow pt-20 px-6 max-w-screen-xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-4 text-sm mt-10">
        &copy; 2024 利用者画面
      </footer>
    </div>
  );
}

// リンク定義（英語＋ルビ）
const navItems = [
  { href: "/user/clock", title: "Clock", subtitle: "打刻" },
  { href: "/user/attendance", title: "History", subtitle: "履歴" },
];
