"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Badge = {
  name: string;
  level: number;
};

type Member = {
  uid: string;
  displayName: string;
  email: string;
  role: "student" | "teacher";
  selfTags?: string[];
  certifiedTags?: string[];
  badges?: Badge[] | string[];
  bio?: string;
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list = snap.docs.map((docSnap) => docSnap.data() as Member);
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
              <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
                <Link href={`/members/${member.uid}`}>{member.displayName}</Link>
              </h2>

              
              <p>ロール: {member.role}</p>

              <p>
                自己申告タグ:{" "}
                {member.selfTags?.length ? member.selfTags.join(" / ") : "なし"}
              </p>

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