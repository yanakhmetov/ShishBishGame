"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { useAppContext } from "@/context/AppContext";

export const SignOutButton = () => {
  const { t } = useAppContext();
  return (
    <button
      onClick={() => signOut()}
      className="btn-secondary"
      style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "8px 16px" }}
    >
      <LogOut size={18} />
      {t("signOut")}
    </button>
  );
};
