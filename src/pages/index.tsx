//src/pages/index.tsx
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold mb-8">ログイン画面</h1>
      <div className="flex flex-col gap-4">
        {/* 管理者ログインボタン */}
        <button
          onClick={() => router.push("/admin/login")}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
        >
          管理者ログイン
        </button>

        {/* 利用者ログインボタン */}
        <button
          onClick={() => router.push("/user/login")}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none"
        >
          利用者ログイン
        </button>
      </div>
    </div>
  );
}
