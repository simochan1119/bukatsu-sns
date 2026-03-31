"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Badge = {
  name: string;
  level: number;
};

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  role: "student" | "teacher";
  selfTags?: string[];
  certifiedTags?: string[];
  badges?: Badge[] | string[];
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
          setProfile(snap.data() as UserProfile);
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

      <h1 style={{ fontSize: 30, fontWeight: "bold", marginBottom: 12 }}>
        {profile.displayName}
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
          <strong>ロール:</strong> {profile.role}
        </p>

        <p>
          <strong>ひとこと:</strong> {profile.bio?.trim() ? profile.bio : "まだありません"}
        </p>

        <div>
          <strong>自己申告タグ:</strong>
          <div style={{ marginTop: 6 }}>
            {profile.selfTags?.length ? (
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
            {profile.certifiedTags?.length ? (
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
            {Array.isArray(profile.badges) && profile.badges.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {profile.badges.map((badge, index) => {
                  if (typeof badge === "string") {
                    return (
                      <div
                        key={index}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 10,
                          padding: 10,
                        }}
                      >
                        {badge}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={index}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      {badge.name} Lv{badge.level}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>まだありません</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}