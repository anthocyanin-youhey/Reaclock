import { supabase } from "../../../utils/supabaseCliants";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { userId, type } = req.body; // userId: ユーザーID, type: "clock_in" または "clock_out"

    if (!userId || !type) {
      return res
        .status(400)
        .json({ error: "リクエストデータが不足しています。" });
    }

    if (!["clock_in", "clock_out"].includes(type)) {
      return res.status(400).json({ error: "無効な打刻タイプです。" });
    }

    try {
      const currentDate = new Date().toISOString().split("T")[0]; // 現在の日付 (YYYY-MM-DD)
      const currentTime = new Date().toTimeString().split(" ")[0]; // 現在の時刻 (HH:mm:ss)

      // レコード作成
      const record = {
        user_id: userId,
        work_date: currentDate,
        [type]: currentTime, // "clock_in" または "clock_out" に現在時刻を設定
      };

      // データベースにアップサート (user_id と work_date を基準に更新または挿入)
      const { error } = await supabase
        .from("attendance_records")
        .upsert([record], { onConflict: "user_id,work_date" });

      if (error) {
        console.error("Supabaseエラー:", error);
        return res
          .status(400)
          .json({ error: "データベースエラーが発生しました。" });
      }

      return res.status(200).json({ message: "打刻が記録されました。" });
    } catch (error) {
      console.error("サーバーエラー:", error);
      return res.status(500).json({ error: "サーバーエラーが発生しました。" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
