// src/pages/api/admin/createStaff.ts

import { supabase } from "../../../utils/supabaseCliants"; // Supabaseクライアントをインポート
import bcrypt from "bcrypt"; // パスワードハッシュ化用ライブラリ

export default async function handler(req, res) {
  if (req.method === "POST") {
    // POSTリクエストに対する処理
    const { name, password, isAdmin, employeeNumber } = req.body;

    try {
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(password, 10);

      // 新しいスタッフをSupabaseに登録
      const { data, error } = await supabase.from("users").insert([
        {
          name,
          employee_number: employeeNumber,
          password_hash: hashedPassword,
          is_admin: isAdmin,
        },
      ]);

      if (error) {
        return res
          .status(400)
          .json({ error: "スタッフの登録に失敗しました。" });
      }

      return res.status(200).json({
        message: "スタッフ登録成功",
        employeeNumber: employeeNumber,
      });
    } catch (err) {
      console.error("登録エラー:", err);
      return res
        .status(500)
        .json({ error: "スタッフ登録処理中にエラーが発生しました。" });
    }
  } else {
    // POST以外のリクエストは許可しない
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
