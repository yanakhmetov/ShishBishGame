"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { ThemeLanguageToggle } from "@/components/ThemeLanguageToggle";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useAppContext();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/login");
      } else {
        const msg = await res.text();
        setError(msg || t("somethingWentWrong"));
      }
    } catch (err) {
      setError(t("failedRegister"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ThemeLanguageToggle />
      <div className="container">
      <div className="glass card">
        <h1 className="glow-text">{t("createAccount")}</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "2rem" }}>
          {t("joinNow")}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div style={{ position: "relative" }}>
            <UserIcon size={18} style={{ position: "absolute", left: "12px", top: "14px", color: "var(--accent)" }} />
            <input
              type="text"
              placeholder={t("nickname")}
              className="input-field"
              style={{ paddingLeft: "40px" }}
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Mail size={18} style={{ position: "absolute", left: "12px", top: "14px", color: "var(--accent)" }} />
            <input
              type="email"
              placeholder={t("email")}
              className="input-field"
              style={{ paddingLeft: "40px" }}
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock size={18} style={{ position: "absolute", left: "12px", top: "14px", color: "var(--accent)" }} />
            <input
              type="password"
              placeholder={t("password")}
              className="input-field"
              style={{ paddingLeft: "40px" }}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          {error && <p className="error-bg">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
            {t("register")}
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.9rem" }}>
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: "600" }}>
            {t("signIn")}
          </Link>
        </p>
      </div>
      
      <style jsx global>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </>
  );
}
