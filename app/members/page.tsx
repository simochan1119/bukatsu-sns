"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BadgeChip, GradeChip, RoleChip } from "@/app/components/BadgeChips";
import { styles } from "@/app/components/ui";

type Role = "student" | "teacher" | "leader";

type FirestoreUserDoc = {
  displayName?: string;
  email?: string;
  role?: Role;
  grade?: number;
  selfTags?: string[];
  badges?: string[];
  certifiedTags?: string[];
  bio?: string;
  photoURL?: string;
};

type Member = {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  grade?: number;
  selfTags: string[];
  badges: string[];
  certifiedTags: string[];
  bio?: string;
  photoURL?: string;
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
      const snap = await getDocs(collection(db, "users"));

      const list: Member[] = snap.docs.map((docSnap) => {
        const data = docSnap.data() as FirestoreUserDoc;

        return {
          uid: docSnap.id,
          displayName: data.displayName ?? "名無し",
          email: data.email ?? "",
          role: (data.role ?? "student") as Role,
          grade: data.grade,
          selfTags: data.selfTags ?? [],
          badges: data.badges ?? [],
          certifiedTags: data.certifiedTags ?? [],
          bio: data.bio ?? "",
          photoURL: data.photoURL,
        };
      });

      list.sort((a, b) => {
        const roleDiff = rolePriority[b.role] - rolePriority[a.role];
        if (roleDiff !== 0) return roleDiff;
        return (b.grade ?? 0) - (a.grade ?? 0);
      });

      setMembers(list);
      setLoading(false);
    };

    fetchMembers();
  }, []);

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>部員一覧</h1>

      <Link href="/" style={styles.linkButton}>
        ← ホームへ戻る
      </Link>

      <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
        {members.map((member) => (
          <div key={member.uid} style={styles.card}>
            
            {/* 上段 */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={member.photoURL || "/default-avatar.png"}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />

              <div>
                <h2
                  style={{
                    margin: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {member.displayName}
                  {member.role !== "student" && (
                    <RoleChip role={member.role} />
                  )}
                  <GradeChip grade={member.grade} />
                </h2>
              </div>
            </div>

            {/* 教員タグ */}
            <div>
              <strong>教員タグ</strong>
              <div style={{ marginTop: 6 }}>
                {member.certifiedTags.length ? (
                  member.certifiedTags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        background: "#fff8e1",
                        border: "1px solid #fbc02d",
                        borderRadius: 999,
                        padding: "4px 10px",
                        marginRight: 6,
                      }}
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  "なし"
                )}
              </div>
            </div>

            {/* 自己タグ */}
            <div>
              <strong>自己タグ</strong>
              <p style={{ marginTop: 6 }}>
                {member.selfTags.length
                  ? member.selfTags.join(" / ")
                  : "なし"}
              </p>
            </div>

            {/* バッジ */}
            <div>
              <strong>バッジ</strong>
              <div style={{ marginTop: 6 }}>
                {member.badges.length ? (
                  member.badges.map((b, i) => (
                    <BadgeChip key={i} label={b} />
                  ))
                ) : (
                  "なし"
                )}
              </div>
            </div>

            {/* 🔥 ボタン化 */}
            <div style={{ marginTop: 10 }}>
              <Link
                href={`/members/${member.uid}`}
                style={styles.buttonPrimary}
              >
                プロフィールを見る
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}