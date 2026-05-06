"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
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
  certifiedTags?: string[];
  badges?: string[];
  bio?: string;
  photoURL?: string;
};

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  grade?: number;
  selfTags: string[];
  certifiedTags: string[];
  badges: string[];
  bio?: string;
  photoURL?: string;
};

export default function MemberProfilePage() {
  const params = useParams();
  const uid = params.uid as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;

      const snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        const data = snap.data() as FirestoreUserDoc;

        setProfile({
          uid,
          displayName: data.displayName ?? "名無し",
          email: data.email ?? "",
          role: (data.role ?? "student") as Role,
          grade: data.grade,
          selfTags: data.selfTags ?? [],
          certifiedTags: data.certifiedTags ?? [],
          badges: data.badges ?? [],
          bio: data.bio ?? "",
          photoURL: data.photoURL,
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [uid]);

  if (loading) return <p style={{ padding: 24 }}>読み込み中...</p>;

  if (!profile) {
    return (
      <main style={{ padding: 24 }}>
        <p>プロフィールが見つかりません</p>
        <Link href="/members" style={styles.buttonSecondary}>
          部員一覧へ戻る
        </Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      
      <Link href="/members" style={styles.buttonSecondary}>
        ← 部員一覧へ戻る
      </Link>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 20 }}>
        <img
          src={profile.photoURL || "/default-avatar.png"}
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />

        <h1
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {profile.displayName}
          {profile.role !== "student" && <RoleChip role={profile.role} />}
          <GradeChip grade={profile.grade} />
        </h1>
      </div>

      {/* カード */}
      <div style={{ ...styles.card, marginTop: 20 }}>

        <p>
          <strong>学年:</strong>{" "}
          {profile.grade ? `${profile.grade}年生` : "未設定"}
        </p>

        <p>
          <strong>ひとこと:</strong>{" "}
          {profile.bio?.trim() ? profile.bio : "まだありません"}
        </p>

        {/* 自己タグ */}
        <div>
          <strong>自己タグ</strong>
          <div style={{ marginTop: 8 }}>
            {profile.selfTags.length ? (
              profile.selfTags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: 999,
                    padding: "6px 10px",
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

        {/* 教員タグ */}
        <div>
          <strong>教員タグ</strong>
          <div style={{ marginTop: 8 }}>
            {profile.certifiedTags.length ? (
              profile.certifiedTags.map((tag, i) => (
                <span
                  key={i}
                  style={{
                    background: "#fff8e1",
                    border: "1px solid #fbc02d",
                    borderRadius: 999,
                    padding: "6px 10px",
                    marginRight: 6,
                    fontWeight: "bold",
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

        {/* バッジ */}
        <div>
          <strong>バッジ</strong>
          <div style={{ marginTop: 8 }}>
            {profile.badges.length ? (
              profile.badges.map((b, i) => (
                <BadgeChip key={i} label={b} />
              ))
            ) : (
              "なし"
            )}
          </div>
        </div>

      </div>
    </main>
  );
}