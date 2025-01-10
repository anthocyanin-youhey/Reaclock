import { useState, useEffect } from "react";
import { requireUserAuth } from "../../utils/authHelpers";
import UserLayout from "../../components/UserLayout";
import { supabase } from "../../utils/supabaseCliants";

export const getServerSideProps = requireUserAuth;

export default function ClockPage({
  user,
}: {
  user: { name: string; id: number };
}) {
  const [status, setStatus] = useState("");
  const [isClockInDisabled, setIsClockInDisabled] = useState(false);
  const [isClockOutDisabled, setIsClockOutDisabled] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>(""); // 現在の時間
  const [clockInTime, setClockInTime] = useState<string>("未記録"); // 出勤時間
  const [clockOutTime, setClockOutTime] = useState<string>("未記録"); // 退勤時間

  useEffect(() => {
    // 現在の日本時間を更新
    const timer = setInterval(() => {
      const now = new Date();
      const jstTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit", // 秒を追加
      }).format(now);
      setCurrentTime(jstTime); // HH:MM:SS
    }, 1000);
    return () => clearInterval(timer); // クリーンアップ
  }, []);

  useEffect(() => {
    // 今日の打刻情報を取得
    const fetchAttendance = async () => {
      try {
        const now = new Date();
        const jstDate = new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now);

        const currentDate = jstDate.split("/").join("-"); // YYYY-MM-DD フォーマットに変換

        const { data, error } = await supabase
          .from("attendance_records")
          .select("clock_in, clock_out")
          .eq("user_id", user.id)
          .eq("work_date", currentDate)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("データ取得エラー:", error);
          setStatus("打刻情報の取得に失敗しました。");
        } else if (data) {
          setClockInTime(
            data.clock_in
              ? data.clock_in.slice(0, 5) // HH:MM のみ抽出
              : "未記録"
          );
          setClockOutTime(
            data.clock_out
              ? data.clock_out.slice(0, 5) // HH:MM のみ抽出
              : "未記録"
          );
          setIsClockInDisabled(!!data.clock_in);
          setIsClockOutDisabled(!!data.clock_out);
        }
      } catch (err) {
        console.error("システムエラー:", err);
        setStatus("システムエラーが発生しました。");
      }
    };

    fetchAttendance();
  }, [user.id]);

  const handleClock = async (type: "clock_in" | "clock_out") => {
    try {
      // 表示されている現在時刻を取得
      const now = new Date();
      const jstTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit", // 秒を追加
      }).format(now);
      const jstDate = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .format(now)
        .split("/")
        .join("-"); // YYYY-MM-DD

      const response = await fetch("/api/user/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type,
          time: jstTime,
          date: jstDate,
        }),
      });

      if (response.ok) {
        const formattedTime = jstTime.slice(0, 5); // HH:MM のみ
        if (type === "clock_in") {
          setClockInTime(formattedTime);
          setIsClockInDisabled(true);
          setStatus("出勤が記録されました。");
        } else {
          setClockOutTime(formattedTime);
          setIsClockOutDisabled(true);
          setStatus("退勤が記録されました。");
        }
      } else {
        setStatus("記録に失敗しました。");
      }
    } catch (error) {
      console.error("記録エラー:", error);
      setStatus("記録中にエラーが発生しました。");
    }
  };

  return (
    <UserLayout userName={user.name}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">出退勤打刻</h1>
        <p className="text-4xl font-bold mb-6">{currentTime}</p>{" "}
        {/* HH:MM:SS フォーマット */}
        <div className="mb-6">
          <p className="text-xl">出勤時間：{clockInTime}</p>
          <p className="text-xl">退勤時間：{clockOutTime}</p>
        </div>
        <p className="text-red-500 mb-4">{status}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleClock("clock_in")}
            className={`px-6 py-3 rounded ${
              isClockInDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
            disabled={isClockInDisabled}
          >
            出勤
          </button>
          <button
            onClick={() => handleClock("clock_out")}
            className={`px-6 py-3 rounded ${
              isClockOutDisabled
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
            disabled={isClockOutDisabled}
          >
            退勤
          </button>
        </div>
      </div>
    </UserLayout>
  );
}
