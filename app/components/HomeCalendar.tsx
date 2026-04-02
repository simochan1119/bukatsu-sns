"use client";

import { useEffect, useMemo, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";

type AvailabilityMap = Record<string, boolean>;

type EventData = {
  time?: string | null;
  title?: string;
  note?: string | null;
  [key: string]: unknown;
};

type UserData = {
  id: string;
  displayName?: string;
  availability?: AvailabilityMap;
  role?: "student" | "teacher";
  [key: string]: unknown;
};

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthMatrix(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startDay);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }

  return days;
}

export default function HomeCalendar() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [events, setEvents] = useState<Record<string, EventData>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [myAvailability, setMyAvailability] = useState<AvailabilityMap>({});
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [month, setMonth] = useState(() => new Date());

  const user = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      try {
        const userSnap = await getDocs(collection(db, "users"));
        const list: UserData[] = userSnap.docs.map((d) => ({
          ...(d.data() as Omit<UserData, "id">),
          id: d.id,
        }));

        setUsers(list);

        const me = list.find((u) => u.id === user?.uid);
        setMyAvailability(me?.availability || {});
        setRole(me?.role || "student");

        const eventSnap = await getDocs(collection(db, "events"));
        const ev: Record<string, EventData> = {};
        eventSnap.forEach((snap) => {
          ev[snap.id] = snap.data() as EventData;
        });
        setEvents(ev);
      } catch (error) {
        console.error("データ読み込みエラー:", error);
      }
    };

    load();
  }, [user]);

  const days = useMemo(() => getMonthMatrix(month), [month]);

  const prevMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(formatDateKey(today));
  };

  const toggle = async (dateKey: string) => {
    if (!user) return;

    const prevState = { ...myAvailability };
    const next = { ...myAvailability };

    if (next[dateKey]) {
      delete next[dateKey];
    } else {
      next[dateKey] = true;
    }

    setMyAvailability(next);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        availability: next,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.uid
            ? {
                ...u,
                availability: next,
              }
            : u
        )
      );
    } catch (error) {
      console.error("参加状態更新エラー:", error);
      setMyAvailability(prevState);
    }
  };

  const editEvent = async (dateKey: string) => {
    const current = events[dateKey];

    const title = prompt("活動内容", current?.title ?? "");
    if (title === null) return;

    const time = prompt("時間（例: 15:40-18:00）", current?.time ?? "");
    if (time === null) return;

    const note = prompt("メモ", current?.note ?? "");
    if (note === null) return;

    try {
      await setDoc(doc(db, "events", dateKey), {
        title,
        time,
        note,
      });

      setEvents((prev) => ({
        ...prev,
        [dateKey]: { title, time, note },
      }));
    } catch (error) {
      console.error("イベント更新エラー:", error);
    }
  };

  const getParticipants = (dateKey: string) => {
    return users.filter((u) => u.availability?.[dateKey]);
  };

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const todayKey = formatDateKey(new Date());

  return (
    <div className="calendar-wrap">
      <div className="calendar-card">
        <div className="calendar-header">
          <h2 className="calendar-title">🗓 活動カレンダー</h2>

          <div className="calendar-toolbar">
            <button type="button" onClick={prevMonth} className="nav-btn">
              ←
            </button>

            <div className="month-label">
              {month.getFullYear()}年 {month.getMonth() + 1}月
            </div>

            <button type="button" onClick={nextMonth} className="nav-btn">
              →
            </button>

            <button type="button" onClick={goToToday} className="today-btn">
              今日
            </button>
          </div>
        </div>

        <div className="week-row">
          {dayNames.map((name, index) => (
            <div
              key={name}
              className={`week-name ${index === 0 ? "sun" : ""} ${
                index === 6 ? "sat" : ""
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {days.map((day) => {
            const key = formatDateKey(day);
            const event = events[key];
            const isMine = !!myAvailability[key];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const isCurrentMonth = day.getMonth() === month.getMonth();

            const classNames = [
              "day-cell",
              isToday ? "today" : "",
              isSelected ? "selected" : "",
              isMine ? "mine" : "",
              event ? "has-event" : "",
              !isCurrentMonth ? "other-month" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className={classNames}
              >
                <div className="day-top">
                  <span className="day-number">{day.getDate()}</span>
                </div>

                <div className="day-middle">
                  <div className="time-text">{event?.time?.trim() ? event.time : "-"}</div>
                </div>

                <div className="day-bottom">
                  <span className={`status-badge ${isMine ? "ok" : "pending"}`}>
                    {isMine ? "参加可" : "未定"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="detail-card">
          <div className="detail-header">
            <h3 className="detail-title">{selectedDate}</h3>
          </div>

          {events[selectedDate] ? (
            <div className="detail-body">
              <p className="detail-row">
                <strong>時間：</strong>
                {events[selectedDate].time || "-"}
              </p>
              <p className="detail-row">
                <strong>活動：</strong>
                {events[selectedDate].title || "-"}
              </p>
              <p className="detail-row">
                <strong>メモ：</strong>
                {events[selectedDate].note || "-"}
              </p>
            </div>
          ) : (
            <p className="detail-empty">この日の予定はまだありません。</p>
          )}

          <div className="action-row">
            <button
              type="button"
              onClick={() => toggle(selectedDate)}
              className={`action-btn ${
                myAvailability[selectedDate] ? "cancel-btn" : "join-btn"
              }`}
            >
              {myAvailability[selectedDate] ? "参加取り消し" : "参加する"}
            </button>

            {role === "teacher" && (
              <button
                type="button"
                onClick={() => editEvent(selectedDate)}
                className="action-btn edit-btn"
              >
                イベント編集
              </button>
            )}
          </div>

          <div className="participants-box">
            <h4 className="participants-title">参加できる人</h4>

            {getParticipants(selectedDate).length > 0 ? (
              <ul className="participants-list">
                {getParticipants(selectedDate).map((u) => (
                  <li key={u.id} className="participant-item">
                    {u.displayName || "名前未設定"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="participants-empty">まだいません</p>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-wrap {
          margin-top: 40px;
          display: grid;
          gap: 20px;
        }

        .calendar-card,
        .detail-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
          padding: 18px;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .calendar-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #0f172a;
        }

        .calendar-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .month-label {
          min-width: 110px;
          text-align: center;
          font-weight: 800;
          color: #1f2937;
        }

        .nav-btn,
        .today-btn,
        .action-btn {
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.18s ease;
          font-weight: 700;
        }

        .nav-btn:hover,
        .today-btn:hover,
        .action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
        }

        .nav-btn {
          width: 42px;
          height: 42px;
          font-size: 1rem;
        }

        .today-btn {
          padding: 0 14px;
          height: 42px;
        }

        .week-row {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 8px;
        }

        .week-name {
          text-align: center;
          font-size: 0.95rem;
          font-weight: 800;
          color: #475569;
          padding: 6px 0;
        }

        .week-name.sun {
          color: #dc2626;
        }

        .week-name.sat {
          color: #2563eb;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
        }

        .day-cell {
          height: 126px; /* ← ここで完全に高さ固定 */
          border-radius: 18px;
          border: 1px solid #dbe1ea;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 10px 6px;
          cursor: pointer;
          color: #111827;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          transition: all 0.18s ease;
          box-sizing: border-box;
          overflow: hidden;
        }

        .day-cell:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
        }

        .day-cell.other-month {
          color: #9ca3af;
          background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
        }

        .day-cell.has-event {
          background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
        }

        .day-cell.mine {
          background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
        }

        .day-cell.today {
          border: 2px solid #3b82f6;
        }

        .day-cell.selected {
          border: 2px solid #111827;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        .day-top,
        .day-middle,
        .day-bottom {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .day-top {
          min-height: 22px;
        }

        .day-middle {
          flex: 1;
          padding: 4px 0;
        }

        .day-bottom {
          min-height: 28px;
        }

        .day-number {
          font-size: 1.75rem;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .time-text {
          font-size: 0.82rem;
          line-height: 1.2;
          color: #374151;
          font-weight: 700;
          white-space: normal;
          word-break: break-word;
          overflow-wrap: anywhere;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          max-width: 100%;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }

        .status-badge.ok {
          background: #ffffffcc;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .status-badge.pending {
          background: #ffffffcc;
          color: #475569;
          border: 1px solid #e5e7eb;
        }

        .detail-header {
          margin-bottom: 10px;
        }

        .detail-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #0f172a;
        }

        .detail-body {
          display: grid;
          gap: 8px;
        }

        .detail-row,
        .detail-empty,
        .participants-empty {
          margin: 0;
          color: #374151;
        }

        .action-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }

        .action-btn {
          padding: 10px 14px;
        }

        .join-btn {
          background: #dcfce7;
        }

        .cancel-btn {
          background: #fee2e2;
        }

        .edit-btn {
          background: #fef3c7;
        }

        .participants-box {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #e5e7eb;
        }

        .participants-title {
          margin: 0 0 8px 0;
          font-size: 1rem;
          font-weight: 800;
        }

        .participants-list {
          margin: 0;
          padding-left: 20px;
        }

        .participant-item {
          margin: 4px 0;
        }

        @media (max-width: 768px) {
          .calendar-card,
          .detail-card {
            border-radius: 18px;
            padding: 12px;
          }

          .calendar-title {
            font-size: 1.05rem;
          }

          .month-label {
            min-width: 96px;
            font-size: 0.98rem;
          }

          .week-row,
          .calendar-grid {
            gap: 6px;
          }

          .week-name {
            font-size: 0.85rem;
            padding: 4px 0;
          }

          .day-cell {
            height: 108px; /* スマホでも完全固定 */
            border-radius: 14px;
            padding: 8px 4px;
          }

          .day-number {
            font-size: 1.25rem;
          }

          .time-text {
            font-size: 0.72rem;
            line-height: 1.15;
          }

          .status-badge {
            font-size: 0.68rem;
            padding: 3px 8px;
            min-height: 22px;
          }

          .nav-btn,
          .today-btn {
            height: 38px;
          }

          .nav-btn {
            width: 38px;
          }
        }

        @media (max-width: 420px) {
          .day-cell {
            height: 98px;
            padding: 6px 3px;
          }

          .day-number {
            font-size: 1.15rem;
          }

          .time-text {
            font-size: 0.68rem;
          }

          .status-badge {
            font-size: 0.64rem;
            padding: 2px 6px;
          }
        }
      `}</style>
    </div>
  );
}