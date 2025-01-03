// /src/pages/api/admin/updateStaff.ts
import { supabase } from "../../../utils/supabaseCliants";
import bcrypt from "bcrypt";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { id, name, password } = req.body;

    try {
      const updates: any = { name };

      if (password) {
        // パスワードが入力された場合のみハッシュ化して追加
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.password_hash = hashedPassword;
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("スタッフ情報更新エラー:", error);
        return res
          .status(500)
          .json({ error: "スタッフ情報の更新に失敗しました。" });
      }

      return res.status(200).json({ message: "スタッフ情報を更新しました！" });
    } catch (error) {
      console.error("サーバーエラー:", error);
      return res.status(500).json({ error: "サーバーエラーが発生しました。" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
