type Role = "student" | "teacher" | "leader";

export function RoleChip({ role }: { role: Role }) {
  if (role === "student") return null;

  const style =
    role === "teacher"
      ? {
          background: "#e8f1ff",
          color: "#2f5fb3",
          border: "1px solid #9ec0ff",
        }
      : {
          background: "#f1e8ff",
          color: "#7a3fd1",
          border: "1px solid #c9a8ff",
        };

  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: 8,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {role}
    </span>
  );
}

export function BadgeChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.2,
        background: "#fff7d6",
        color: "#8a6500",
        border: "1px solid #e0bf52",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {label}
    </span>
  );
}

export function GradeChip({ grade }: { grade?: number }) {
  if (!grade) return null;

  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: 8,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        background: "#f3f4f6",
        color: "#374151",
        border: "1px solid #d1d5db",
      }}
    >
      {grade}年生
    </span>
  );
}