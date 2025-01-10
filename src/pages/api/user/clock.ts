//reaclock\src\pages\api\user\clock.ts
import { supabase } from "../../../utils/supabaseCliants";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { userId, type, time, date } = req.body;

    if (!userId || !type || !time || !date) {
      return res
        .status(400)
        .json({ error: "リクエストデータが不足しています。" });
    }

    if (!["clock_in", "clock_out"].includes(type)) {
      return res.status(400).json({ error: "無効な打刻タイプです。" });
    }

    try {
      const record = {
        user_id: userId,
        work_date: date,
        [type]: time,
      };

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
