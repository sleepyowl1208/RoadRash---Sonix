"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import App from "@/App"; // Reusing the main game logic component

export default function RacePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
     return <div className="h-screen w-screen bg-black text-neon-blue font-mono flex items-center justify-center">AUTHENTICATING...</div>;
  }

  return <App />;
}
