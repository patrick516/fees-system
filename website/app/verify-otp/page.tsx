// app/verify-otp/page.tsx
"use client";

import { useState } from "react";

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState("");

  return (
    <div>
      <h1>Verify OTP</h1>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
      />
      <button>Verify</button>
    </div>
  );
}
