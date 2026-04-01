"use client";

import { useEffect } from "react";

export default function TestPro() {
  useEffect(() => {
    localStorage.setItem("pro_test", "true");
    localStorage.setItem("valuengine_pro", "true");
    localStorage.setItem("valuengine_pro_ts", Date.now().toString());
  }, []);

  return (
    <div style={{ color: "white", padding: "2rem", background: "#0a1628", minHeight: "100vh" }}>
      <p>Pro activé en localStorage.</p>
      <a href="/dashboard" style={{ color: "#C9A84C" }}>→ Dashboard</a>
    </div>
  );
}
