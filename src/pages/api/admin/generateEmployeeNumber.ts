// src/pages/api/admin/generateEmployeeNumber.ts

import { supabase } from "../../../utils/supabaseCliants"; // Supabaseクライアントをインポート

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 社員番号を生成する処理
    try {
      // 既存の社員番号の最大値を取得
      const { data, error } = await supabase
        .from("users")
        .select("employee_number", { count: "exact" });

      if (error) {
        return res
          .status(500)
          .json({ error: "社員番号の取得に失敗しました。" });
      }

      // 新しい社員番号を計算（既存の最大値 + 1）
      const maxEmployeeNumber = data?.length
        ? Math.max(...data.map((user) => parseInt(user.employee_number))) + 1
        : 1001;

      res.status(200).json({ employeeNumber: maxEmployeeNumber });
    } catch (err) {
      console.error("社員番号生成エラー:", err);
      res.status(500).json({ error: "社員番号生成中にエラーが発生しました。" });
    }
  } else {
    // GET以外のリクエストは許可しない
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
