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
  const [isInitializing, setIsInitializing] = useState(true); // ログイン直後のローディング状態
  const [status, setStatus] = useState("");
  const [isClockInDisabled, setIsClockInDisabled] = useState(false);
  const [isClockOutDisabled, setIsClockOutDisabled] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("未設定");
  const [clockInTime, setClockInTime] = useState<string>("未記録");
  const [clockOutTime, setClockOutTime] = useState<string>("未記録");
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [shiftInfo, setShiftInfo] = useState<{
    startTime: string;
    endTime: string;
    hourlyRate: string;
  }>({
    startTime: "未設定",
    endTime: "未設定",
    hourlyRate: "未設定",
  });
  const [todayWorkLocation, setTodayWorkLocation] = useState<string>("未設定");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const jstTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
      setCurrentTime(jstTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const fetchAttendanceAndShift = async () => {
      try {
        const now = new Date();
        const jstDate = new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .format(now)
          .split("/")
          .join("-");

        const { data: attendanceData } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", user.id)
          .eq("work_date", jstDate)
          .maybeSingle();

        if (attendanceData) {
          setClockInTime(
            attendanceData.clock_in
              ? attendanceData.clock_in.slice(0, 5)
              : "未記録"
          );
          setClockOutTime(
            attendanceData.clock_out
              ? attendanceData.clock_out.slice(0, 5)
              : "未記録"
          );
          setIsClockInDisabled(!!attendanceData?.clock_in);
          setIsClockOutDisabled(!!attendanceData?.clock_out);
        }

        const { data: shiftData } = await supabase
          .from("shifts")
          .select(
            `
            id, date, start_time, end_time,
            user_hourly_rates!fk_shifts_user_hourly_rate(
              hourly_rate,
              work_data!fk_user_hourly_rates_work_location(location_name)
            )
          `
          )
          .eq("user_id", user.id)
          .eq("date", jstDate)
          .maybeSingle();

        if (shiftData) {
          setShiftId(shiftData.id);

          const userHourlyRate = Array.isArray(shiftData.user_hourly_rates)
            ? shiftData.user_hourly_rates[0]
            : shiftData.user_hourly_rates;
          const workData = Array.isArray(userHourlyRate?.work_data)
            ? userHourlyRate.work_data[0]
            : userHourlyRate?.work_data;

          setShiftInfo({
            startTime: shiftData.start_time?.slice(0, 5) || "未設定",
            endTime: shiftData.end_time?.slice(0, 5) || "未設定",
            hourlyRate: userHourlyRate?.hourly_rate
              ? `${userHourlyRate.hourly_rate}円`
              : "未設定",
          });

          setTodayWorkLocation(workData?.location_name || "未設定");
        }

        setIsInitializing(false);
      } catch (err) {
        console.error("システムエラー:", err);
        setStatus("システムエラーが発生しました。");
        setIsInitializing(false);
      }
    };

    fetchAttendanceAndShift();
  }, [user.id]);

  const handleClock = async (type: "clock_in" | "clock_out") => {
    try {
      const now = new Date();
      const jstTime = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now);
      const jstDate = now.toISOString().split("T")[0];

      const response = await fetch("/api/user/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type,
          time: jstTime,
          date: jstDate,
          shiftId,
        }),
      });

      if (response.ok) {
        const formattedTime = jstTime.slice(0, 5);
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

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
          <p className="text-gray-700 text-lg font-semibold">ログイン中...</p>
        </div>
      </div>
    );
  }
  return (
    <UserLayout userName={user.name}>
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">出退勤打刻</h1>
        <p className="text-4xl font-bold mb-6">{currentTime}</p>

        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto mb-8">
          <h2 className="text-2xl font-bold mb-4">今日のシフト情報</h2>
          <div className="space-y-3">
            <InfoRow label="勤務地" value={todayWorkLocation} />
            <InfoRow label="開始時間" value={shiftInfo.startTime} />
            <InfoRow label="終了時間" value={shiftInfo.endTime} />
            <InfoRow label="時給" value={shiftInfo.hourlyRate} />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xl mb-2">出勤時間：{clockInTime}</p>
          <p className="text-xl">退勤時間：{clockOutTime}</p>
        </div>
        <p className="text-red-500 mt-4">{status}</p>
        <div className="flex justify-center gap-4 mt-6">
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

// 補助コンポーネント
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
      <span className="text-gray-600">{label}</span>
      <span
        className={`font-medium ${
          value === "未設定"
            ? "text-gray-400"
            : label === "時給"
            ? "text-green-600"
            : "text-blue-600"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
