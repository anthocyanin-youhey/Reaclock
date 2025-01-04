// /src/pages/admin/staffList.tsx
import AdminLayout from "../../components/AdminLayout"; // 共通レイアウト
import { useRouter } from "next/router"; // ページ遷移用
import { useState, useEffect } from "react"; // 状態管理と副作用
import { supabase } from "../../utils/supabaseCliants"; // Supabaseクライアント
import { requireAdminAuth } from "../../utils/authHelpers"; // サーバーサイド認証

export const getServerSideProps = requireAdminAuth;

export default function StaffList({ admin }: { admin: { name: string } }) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null); // 削除対象スタッフ
  const [isModalOpen, setIsModalOpen] = useState(false); // モーダル表示状態

  const fetchStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, employee_number, name");

      if (error) {
        console.error("スタッフリスト取得エラー:", error);
        setErrorMessage("スタッフリストの取得に失敗しました。");
        return;
      }

      setStaffList(data || []);
    } catch (error) {
      console.error("データ取得中にエラーが発生:", error);
      setErrorMessage("データ取得中にエラーが発生しました。");
    }
  };

  const handleDeleteStaff = async (staffId: number) => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", staffId);

      if (error) {
        console.error("削除エラー:", error);
        alert("スタッフの削除に失敗しました。");
      } else {
        alert("スタッフが正常に削除されました。");
        fetchStaffList(); // リストを更新
        setIsModalOpen(false); // モーダルを閉じる
      }
    } catch (error) {
      console.error("削除処理中にエラー:", error);
      alert("削除処理中にエラーが発生しました。");
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  return (
    <AdminLayout adminName={admin.name}>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">スタッフ一覧</h1>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        <table className="min-w-full bg-white border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">社員番号</th>
              <th className="border border-gray-300 px-4 py-2">名前</th>
              <th className="border border-gray-300 px-4 py-2">アクション</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff.id}>
                <td className="border border-gray-300 px-4 py-2">
                  {staff.employee_number}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {staff.name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {/* 社員情報編集ボタン */}
                  <button
                    className="text-blue-500 hover:underline mr-2"
                    onClick={() => router.push(`/admin/editStaff/${staff.id}`)}
                  >
                    編集
                  </button>

                  {/* 打刻履歴編集ボタン */}
                  <button
                    className="text-purple-500 hover:underline mr-2"
                    onClick={() =>
                      router.push(`/admin/staffAttendance/${staff.id}`)
                    }
                  >
                    打刻履歴
                  </button>

                  {/* スタッフ削除ボタン */}
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => {
                      setSelectedStaff(staff);
                      setIsModalOpen(true); // モーダルを開く
                    }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 削除確認モーダル */}
        {isModalOpen && selectedStaff && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded shadow-md w-96">
              <h2 className="text-xl font-bold mb-4 text-center">確認</h2>
              <p className="mb-4 text-center">
                {`「${selectedStaff.name} (社員番号: ${selectedStaff.employee_number})」を削除しますか？`}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleDeleteStaff(selectedStaff.id)}
                  className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  削除
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  中止
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
