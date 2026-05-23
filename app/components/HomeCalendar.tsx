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
type UserRole = "student" | "leader" | "teacher";

type EventData = {
  time?: string | null;
  title?: string;
  note?: string | null;
  [key: string]: unknown;
};

type UserData = {
  id: string;
  displayName?: string;
  absence?: AvailabilityMap;
  role?: UserRole;
  [key: string]: unknown;
};

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hasSchedule(event?: EventData) {
  if (!event) return false;

  const title = typeof event.title === "string" ? event.title.trim() : "";
  const time = typeof event.time === "string" ? event.time.trim() : "";
  const note = typeof event.note === "string" ? event.note.trim() : "";

  return title !== "" || time !== "" || note !== "";
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
  const [myAbsence, setMyAbsence] = useState<AvailabilityMap>({});
  const [role, setRole] = useState<UserRole>("student");
  const [month, setMonth] = useState(() => new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    time: "",
    note: "",
  });
  const [savingEvent, setSavingEvent] = useState(false);

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
        setMyAbsence(me?.absence || {});
        setRole((me?.role as UserRole) || "student");

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
  const todayKey = formatDateKey(new Date());
  const canEditEvent = role === "teacher" || role === "leader";

  const prevMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    const key = formatDateKey(today);
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(key);
  };

  const openDayDetail = (dateKey: string) => {
    setSelectedDate(dateKey);
  };

  const toggleAbsence = async (dateKey: string) => {
    if (!user) return;

    const prevState = { ...myAbsence };
    const next = { ...myAbsence };

    if (next[dateKey]) {
      delete next[dateKey];
    } else {
      next[dateKey] = true;
    }

    setMyAbsence(next);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        absence: next,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.uid
            ? {
                ...u,
                absence: next,
              }
            : u
        )
      );
    } catch (error) {
      console.error("欠席状態更新エラー:", error);
      setMyAbsence(prevState);
      alert("保存できませんでした");
    }
  };

  const openEventModal = () => {
    if (!selectedDate) return;

    const current = events[selectedDate];
    setEventForm({
      title: current?.title ? String(current.title) : "",
      time: current?.time ? String(current.time) : "",
      note: current?.note ? String(current.note) : "",
    });
    setIsModalOpen(true);
  };

  const closeEventModal = () => {
    if (savingEvent) return;
    setIsModalOpen(false);
  };

  const saveEvent = async () => {
    if (!selectedDate) return;
    if (!canEditEvent) return;

    setSavingEvent(true);

    try {
      const payload = {
        title: eventForm.title.trim(),
        time: eventForm.time.trim(),
        note: eventForm.note.trim(),
      };

      await setDoc(doc(db, "events", selectedDate), payload);

      setEvents((prev) => ({
        ...prev,
        [selectedDate]: payload,
      }));

      setIsModalOpen(false);
    } catch (error) {
      console.error("イベント更新エラー:", error);
      alert("イベントを保存できませんでした");
    } finally {
      setSavingEvent(false);
    }
  };

  const getAbsentees = (dateKey: string) => {
    return users.filter((u) => u.absence?.[dateKey]);
  };

  const getAttendees = (dateKey: string) => {
    return users.filter((u) => !u.absence?.[dateKey]);
  };

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

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
            const hasEvent = hasSchedule(event);
            const isAbsent = hasEvent && !!myAbsence[key];
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const isCurrentMonth = day.getMonth() === month.getMonth();

            const classNames = [
              "day-cell",
              isToday ? "today" : "",
              isSelected ? "selected" : "",
              isAbsent ? "absent" : "",
              hasEvent ? "has-event" : "",
              !isCurrentMonth ? "other-month" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={key}
                type="button"
                onClick={() => openDayDetail(key)}
                className={classNames}
              >
                <div className="day-top">
                  <span className="day-number">{day.getDate()}</span>
                </div>

                <div className="day-middle">
                  {hasEvent ? (
                    <div className="time-text">
                      {event?.time?.trim() ? event.time : "予定あり"}
                    </div>
                  ) : (
                    <div className="holiday-text">休</div>
                  )}
                </div>

                <div className="day-bottom">
                  {hasEvent && (
                    <span className={`status-badge ${isAbsent ? "absent" : "ok"}`}>
                      {isAbsent ? "欠席" : "出席予定"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="detail-card">
          <div className="detail-header">
            <div>
              <h3 className="detail-title">{selectedDate}</h3>
              <p className="detail-subtitle">
                {role === "teacher"
                  ? "教員モード"
                  : role === "leader"
                  ? "leader モード"
                  : "生徒モード"}
              </p>
            </div>
          </div>

          {hasSchedule(events[selectedDate]) ? (
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
            {hasSchedule(events[selectedDate]) && (
              <button
                type="button"
                onClick={() => toggleAbsence(selectedDate)}
                className={`action-btn ${
                  myAbsence[selectedDate] ? "join-btn" : "cancel-btn"
                }`}
              >
                {myAbsence[selectedDate] ? "欠席を取り消す" : "欠席する"}
              </button>
            )}

            {canEditEvent && (
              <button
                type="button"
                onClick={openEventModal}
                className="action-btn edit-btn"
              >
                イベント編集
              </button>
            )}
          </div>

          {hasSchedule(events[selectedDate]) && (
            <>
              <div className="participants-box">
                <h4 className="participants-title">出席する人</h4>

                {getAttendees(selectedDate).length > 0 ? (
                  <ul className="participants-list">
                    {getAttendees(selectedDate).map((u) => (
                      <li key={u.id} className="participant-item">
                        {u.displayName || "名前未設定"}
                        {u.role === "teacher" && (
                          <span className="mini-role teacher">teacher</span>
                        )}
                        {u.role === "leader" && (
                          <span className="mini-role leader">leader</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="participants-empty">出席予定の人はいません</p>
                )}
              </div>

              <div className="participants-box">
                <h4 className="participants-title">欠席する人</h4>

                {getAbsentees(selectedDate).length > 0 ? (
                  <ul className="participants-list">
                    {getAbsentees(selectedDate).map((u) => (
                      <li key={u.id} className="participant-item">
                        {u.displayName || "名前未設定"}
                        {u.role === "teacher" && (
                          <span className="mini-role teacher">teacher</span>
                        )}
                        {u.role === "leader" && (
                          <span className="mini-role leader">leader</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="participants-empty">欠席予定の人はいません</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-root" onClick={closeEventModal}>
          <div
            className="modal-backdrop"
            aria-hidden="true"
          />
          <div
            className="bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-edit-title"
          >
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div>
                <h3 id="event-edit-title" className="sheet-title">
                  イベント編集
                </h3>
                <p className="sheet-date">{selectedDate}</p>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={closeEventModal}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">活動内容</label>
              <input
                className="form-input"
                value={eventForm.title}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="例：練習試合、ミーティング"
              />
            </div>

            <div className="form-group">
              <label className="form-label">時間</label>
              <input
                className="form-input"
                value={eventForm.time}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, time: e.target.value }))
                }
                placeholder="例：15:40-18:00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">メモ</label>
              <textarea
                className="form-textarea"
                value={eventForm.note}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="持ち物や連絡事項"
                rows={4}
              />
            </div>

            <div className="sheet-actions">
              <button
                type="button"
                className="sheet-btn secondary"
                onClick={closeEventModal}
                disabled={savingEvent}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="sheet-btn primary"
                onClick={saveEvent}
                disabled={savingEvent}
              >
                {savingEvent ? "保存中..." : "保存する"}
              </button>
            </div>
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
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.07);
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
        .action-btn,
        .sheet-btn,
        .close-btn {
          border: 1px solid #d1d5db;
          background: #ffffff;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.18s ease;
          font-weight: 700;
        }

        .nav-btn:hover,
        .today-btn:hover,
        .action-btn:hover,
        .sheet-btn:hover,
        .close-btn:hover {
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
          height: 126px;
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

        .day-cell.absent {
          background: linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%);
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

        .holiday-text {
          font-size: 1.15rem;
          line-height: 1;
          color: #9ca3af;
          font-weight: 900;
          letter-spacing: 0.08em;
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

        .status-badge.absent {
          background: #ffffffcc;
          color: #991b1b;
          border: 1px solid #fecaca;
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

        .detail-subtitle {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 700;
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
          margin: 6px 0;
        }

        .mini-role {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          vertical-align: middle;
        }

        .mini-role.teacher {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .mini-role.leader {
          background: #ede9fe;
          color: #6d28d9;
        }

        .modal-root {
          position: fixed;
          inset: 0;
          z-index: 1000;
        }

        .modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.42);
          backdrop-filter: blur(2px);
        }

        .bottom-sheet {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ffffff;
          border-radius: 22px 22px 0 0;
          padding: 14px 16px calc(20px + env(safe-area-inset-bottom));
          box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.16);
          animation: slideUp 0.22s ease-out;
          max-height: 88vh;
          overflow-y: auto;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0.8;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .sheet-handle {
          width: 52px;
          height: 6px;
          border-radius: 999px;
          background: #cbd5e1;
          margin: 0 auto 12px;
        }

        .sheet-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .sheet-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 900;
          color: #0f172a;
        }

        .sheet-date {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .close-btn {
          width: 40px;
          height: 40px;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .form-group {
          display: grid;
          gap: 6px;
          margin-bottom: 14px;
        }

        .form-label {
          font-size: 0.92rem;
          font-weight: 800;
          color: #334155;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 0.96rem;
          outline: none;
          background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .form-input:focus,
        .form-textarea:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.15);
        }

        .form-textarea {
          resize: vertical;
          min-height: 110px;
        }

        .sheet-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }

        .sheet-btn {
          height: 48px;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .sheet-btn.primary {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .sheet-btn.secondary {
          background: #f8fafc;
          color: #0f172a;
        }

        .sheet-btn:disabled,
        .close-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        @media (min-width: 900px) {
          .bottom-sheet {
            left: 50%;
            right: auto;
            width: 560px;
            transform: translateX(-50%);
            border-radius: 24px;
            bottom: 20px;
          }

          @keyframes slideUp {
            from {
              transform: translate(-50%, 40px);
              opacity: 0.8;
            }
            to {
              transform: translate(-50%, 0);
              opacity: 1;
            }
          }
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
            height: 108px;
            border-radius: 14px;
            padding: 8px 4px;
          }

          .day-number {
            font-size: 1.25rem;
          }

          .holiday-text {
            font-size: 0.95rem;
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

          .sheet-actions {
            grid-template-columns: 1fr;
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

          .holiday-text {
            font-size: 0.9rem;
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