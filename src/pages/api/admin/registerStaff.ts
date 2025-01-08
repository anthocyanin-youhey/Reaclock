// /src/pages/api/admin/registerStaff.ts
import { supabase } from "../../../utils/supabaseCliants";
import bcrypt from "bcrypt";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { name, password, is_admin } = req.body; // is_adminを追加で受け取る

    if (!name || !password || is_admin === undefined) {
      return res
        .status(400)
        .json({ error: "全てのフィールドを入力してください。" });
    }

    try {
      // 登録日の日付を取得 (YYYYMMDD形式)
      const today = new Date();
      const formattedDate = `${today.getFullYear()}${String(
        today.getMonth() + 1
      ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

      // 今日登録されたスタッフの数を取得
      const { count, error: countError } = await supabase
        .from("users")
        .select("*", { count: "exact" })
        .like("employee_number", `${formattedDate}%`); // YYYYMMDD% で検索

      if (countError) {
        console.error("スタッフ数取得エラー:", countError);
        return res.status(500).json({ error: "社員番号生成に失敗しました。" });
      }

      // 新しい社員番号を生成
      const newEmployeeNumber = `${formattedDate}${String(count + 1).padStart(
        2,
        "0"
      )}`;

      // パスワードをハッシュ化
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // スタッフ情報をSupabaseに登録
      const { error } = await supabase.from("users").insert({
        name,
        employee_number: newEmployeeNumber,
        password_hash: passwordHash,
        is_admin, // フロントエンドから受け取ったis_adminを保存
        created_at: new Date(),
      });

      if (error) {
        console.error("スタッフ登録エラー:", error);
        return res.status(500).json({ error: "スタッフ登録に失敗しました。" });
      }

      return res.status(200).json({
        message: "スタッフ登録が完了しました！",
        employee_number: newEmployeeNumber,
      });
    } catch (error) {
      console.error("サーバーエラー:", error);
      return res.status(500).json({
        error: "サーバーエラーが発生しました。もう一度お試しください。",
      });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
