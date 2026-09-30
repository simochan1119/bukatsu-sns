import { collection, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function hasSchedule(eventData: any) {
  const title = typeof eventData?.title === "string" ? eventData.title.trim() : "";
  const time = typeof eventData?.time === "string" ? eventData.time.trim() : "";
  const note = typeof eventData?.note === "string" ? eventData.note.trim() : "";
  return title !== "" || time !== "" || note !== "";
}

export function calculateScoreSync(
  userData: any,
  leaderData: any,
  allEvents: string[]
): { score: number; attendanceRate: number } | null {
  if (userData.role === "teacher") return null;
  if (!leaderData) return null;

  const createdAt = userData.createdAt as Timestamp;
  let createdDateString = "2026-07-01";
  if (createdAt) {
    const date = createdAt.toDate();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const userCreatedAt = `${y}-${m}-${d}`;
    if (userCreatedAt > "2026-07-01") {
      createdDateString = userCreatedAt;
    }
  }

  const today = new Date();
  today.setDate(today.getDate() - 1);
  const yYest = today.getFullYear();
  const mYest = String(today.getMonth() + 1).padStart(2, "0");
  const dYest = String(today.getDate()).padStart(2, "0");
  const yesterdayString = `${yYest}-${mYest}-${dYest}`;

  const validEvents = allEvents.filter(
    (dateKey) => dateKey >= createdDateString && dateKey <= yesterdayString
  );

  let leaderAttendance = 0;
  let studentAttendance = 0;

  for (const dateKey of validEvents) {
    const leaderAbsent = leaderData.absence?.[dateKey] === true;
    const studentAbsent = userData.absence?.[dateKey] === true;

    if (!leaderAbsent) leaderAttendance++;
    if (!studentAbsent) studentAttendance++;
  }

  const badgesCount = Array.isArray(userData.badges) ? userData.badges.length : 0;
  const certifiedTagsCount = Array.isArray(userData.certifiedTags)
    ? userData.certifiedTags.length
    : 0;
  const bonusPoints = (badgesCount + certifiedTagsCount) * 3;

  if (leaderAttendance === 0) {
    return { score: (userData.manualPoints || 0) + bonusPoints, attendanceRate: 0 };
  }

  const rawScore = (studentAttendance / leaderAttendance) * 100;
  return {
    score: Math.floor(rawScore) + (userData.manualPoints || 0) + bonusPoints,
    attendanceRate: Math.floor(rawScore)
  };
}

export async function calculateUserScore(uid: string): Promise<number | null> {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) return null;
  const userData = userDoc.data();

  const usersSnap = await getDocs(collection(db, "users"));
  const leaderDoc = usersSnap.docs.find((d) => d.data().role === "leader");
  const leaderData = leaderDoc ? leaderDoc.data() : null;

  const eventsSnap = await getDocs(collection(db, "events"));
  const allEvents = eventsSnap.docs
    .filter((d) => hasSchedule(d.data()))
    .map((d) => d.id);

  const result = calculateScoreSync(userData, leaderData, allEvents);
  return result ? result.score : null;
}
