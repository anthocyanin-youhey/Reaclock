import { supabase } from "../../../utils/supabaseCliants";
import bcrypt from "bcrypt"; // パスワードハッシュ化用ライブラリ

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, name, password, is_admin } = req.body;

  // 入力チェック
  if (!id || !name) {
    return res.status(400).json({ error: "ID と名前は必須です。" });
  }

  try {
    // 更新データを構築
    const updateData: any = { name, is_admin };

    // パスワードが入力されている場合はハッシュ化して更新データに追加
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10); // パスワードをハッシュ化
      updateData.password_hash = hashedPassword;
    }

    // Supabase でデータを更新
    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("Supabase 更新エラー:", error);
      return res.status(500).json({ error: "データの更新に失敗しました。" });
    }

    res.status(200).json({ message: "スタッフ情報を更新しました。" });
  } catch (err) {
    console.error("APIエラー:", err);
    res.status(500).json({ error: "サーバーエラーが発生しました。" });
  }
}
