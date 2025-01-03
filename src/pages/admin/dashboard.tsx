//reaclock\src\pages\admin\dashboard.tsx
import AdminLayout from "../../components/AdminLayout";
import { requireAdminAuth } from "../../utils/authHelpers";
import Link from "next/link";

export const getServerSideProps = requireAdminAuth;

export default function AdminDashboard({ admin }: { admin: { name: string } }) {
  return (
    <AdminLayout adminName={admin.name}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-6">管理者ダッシュボード</h1>
        <p>以下のリンクから管理者機能にアクセスしてください。</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link href="/admin/createStaff" legacyBehavior>
            <a className="block p-6 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:bg-blue-600">
              スタッフ新規登録
            </a>
          </Link>
          <Link href="/admin/staffList" legacyBehavior>
            <a className="block p-6 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600">
              スタッフ一覧
            </a>
          </Link>
          <Link href="/admin/attendanceRecords" legacyBehavior>
            <a className="block p-6 bg-purple-500 text-white font-bold rounded-lg shadow-lg hover:bg-purple-600">
              打刻履歴
            </a>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
