"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BadgeChip, GradeChip, RoleChip } from "@/app/components/BadgeChips";

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
};

export default function MemberProfilePage() {
  const params = useParams();
  const uid = params.uid as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;

      try {
        const snap = await getDoc(doc(db, "users", uid));

        if (snap.exists()) {
          const data = snap.data() as FirestoreUserDoc;
          setProfile({
            uid,
            displayName: data.displayName ?? "名無し",
            email: data.email ?? "",
            role: (data.role ?? "student") as Role,
            grade: typeof data.grade === "number" ? data.grade : undefined,
            selfTags: Array.isArray(data.selfTags) ? data.selfTags : [],
            certifiedTags: Array.isArray(data.certifiedTags) ? data.certifiedTags : [],
            badges: Array.isArray(data.badges) ? data.badges : [],
            bio: data.bio ?? "",
          });
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("プロフィール取得失敗", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid]);

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <p>読み込み中...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        <p>プロフィールが見つかりません。</p>
        <p style={{ marginTop: 12 }}>
          <Link href="/members">部員一覧へ戻る</Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <p style={{ marginBottom: 16 }}>
        <Link href="/members">← 部員一覧へ戻る</Link>
      </p>

      <h1
        style={{
          fontSize: 30,
          fontWeight: "bold",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {profile.displayName}
        {profile.role !== "student" && <RoleChip role={profile.role} />}
        <GradeChip grade={profile.grade} />
      </h1>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 12,
          padding: 20,
          display: "grid",
          gap: 12,
        }}
      >
        <p>
          <strong>学年:</strong> {profile.grade ? `${profile.grade}年生` : "未設定"}
        </p>

        <p>
          <strong>ひとこと:</strong> {profile.bio?.trim() ? profile.bio : "まだありません"}
        </p>

        <div>
          <strong>自己申告タグ:</strong>
          <div style={{ marginTop: 6 }}>
            {profile.selfTags.length ? (
              profile.selfTags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    display: "inline-block",
                    marginRight: 8,
                    marginBottom: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #aaa",
                  }}
                >
                  {tag}
                </span>
              ))
            ) : (
              <p>まだありません</p>
            )}
          </div>
        </div>

        <div>
          <strong>教員認定タグ:</strong>
          <div style={{ marginTop: 6 }}>
            {profile.certifiedTags.length ? (
              profile.certifiedTags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    display: "inline-block",
                    marginRight: 8,
                    marginBottom: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #4a90e2",
                    background: "#f7fbff",
                  }}
                >
                  {tag}
                </span>
              ))
            ) : (
              <p>まだありません</p>
            )}
          </div>
        </div>

        <div>
          <strong>バッジ:</strong>
          <div style={{ marginTop: 6 }}>
            {profile.badges.length ? (
              profile.badges.map((badge, index) => (
                <BadgeChip key={`${badge}-${index}`} label={badge} />
              ))
            ) : (
              <p>まだありません</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}