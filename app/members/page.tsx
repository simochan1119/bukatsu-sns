"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BadgeChip, GradeChip, RoleChip } from "@/app/components/BadgeChips";

type Role = "student" | "teacher" | "leader";

type FirestoreUserDoc = {
  displayName?: string;
  email?: string;
  role?: Role;
  grade?: number;
  selfTags?: string[];
  badges?: string[];
  bio?: string;
};

type Member = {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  grade?: number;
  selfTags: string[];
  badges: string[];
  bio?: string;
};

const rolePriority: Record<Role, number> = {
  teacher: 3,
  leader: 2,
  student: 1,
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));

        const list: Member[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as FirestoreUserDoc;

          return {
            uid: docSnap.id,
            displayName: data.displayName ?? "名無し",
            email: data.email ?? "",
            role: (data.role ?? "student") as Role,
            grade: typeof data.grade === "number" ? data.grade : undefined,
            selfTags: Array.isArray(data.selfTags) ? data.selfTags : [],
            badges: Array.isArray(data.badges) ? data.badges : [],
            bio: data.bio ?? "",
          };
        });

        list.sort((a, b) => {
          const roleDiff = rolePriority[b.role] - rolePriority[a.role];
          if (roleDiff !== 0) return roleDiff;

          const gradeA = a.grade ?? 0;
          const gradeB = b.grade ?? 0;
          const gradeDiff = gradeB - gradeA;
          if (gradeDiff !== 0) return gradeDiff;

          return a.displayName.localeCompare(b.displayName, "ja");
        });

        setMembers(list);
      } catch (error) {
        console.error("部員取得失敗", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 16 }}>
        部員一覧
      </h1>

      <p style={{ marginBottom: 16 }}>
        <Link href="/">ホームへ戻る</Link>
      </p>

      {loading ? (
        <p>読み込み中...</p>
      ) : members.length === 0 ? (
        <p>まだ部員データがありません。</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {members.map((member) => (
            <div
              key={member.uid}
              style={{
                border: "1px solid #ccc",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link href={`/members/${member.uid}`}>{member.displayName}</Link>
                {member.role !== "student" && <RoleChip role={member.role} />}
                <GradeChip grade={member.grade} />
              </h2>

              <p>
                自己申告タグ:{" "}
                {member.selfTags.length ? member.selfTags.join(" / ") : "なし"}
              </p>

              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <strong>バッジ:</strong>
                <div style={{ marginTop: 8 }}>
                  {member.badges.length ? (
                    member.badges.map((badge, index) => (
                      <BadgeChip key={`${badge}-${index}`} label={badge} />
                    ))
                  ) : (
                    <span style={{ marginLeft: 8 }}>まだありません</span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <Link href={`/members/${member.uid}`}>プロフィールを見る</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}