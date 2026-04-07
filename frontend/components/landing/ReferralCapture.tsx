"use client";

import { useEffect } from "react";

export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) localStorage.setItem("valuengine_ref", ref);
  }, []);
  return null;
}
