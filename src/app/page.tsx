"use client";

import Link from "next/link";
import { Swords } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export default function LandingPage() {
  const { t } = useAppContext();

  return (
    <div className="container" style={{ textAlign: "center" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Swords size={80} color="var(--accent)" style={{ marginBottom: "1rem" }} />
        <h1 className="glow-text" style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>{t("title")}</h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.7, maxWidth: "600px" }}>
          {t("subtitle")}
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem" }}>
        <Link href="/login" className="btn-primary" style={{ padding: "15px 40px", fontSize: "1.1rem" }}>
          {t("signIn")}
        </Link>
        <Link href="/register" className="btn-secondary" style={{ padding: "15px 40px", fontSize: "1.1rem" }}>
          {t("register")}
        </Link>
      </div>

      <div style={{ marginTop: "4rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem", maxWidth: "900px" }}>
        <div className="glass" style={{ padding: "1.5rem" }}>
          <h4 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>{t("realTime")}</h4>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("realTimeDesc")}</p>
        </div>
        <div className="glass" style={{ padding: "1.5rem" }}>
          <h4 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>{t("rankings")}</h4>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("rankingsDesc")}</p>
        </div>
        <div className="glass" style={{ padding: "1.5rem" }}>
          <h4 style={{ color: "var(--accent)", marginBottom: "0.5rem" }}>{t("achievements")}</h4>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("achievementsDesc")}</p>
        </div>
      </div>
    </div>
  );
}
