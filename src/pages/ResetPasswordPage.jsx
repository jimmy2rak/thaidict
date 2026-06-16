import { useState, useEffect } from "react";
import { sendOtp, verifyBrevoOtp, resetPasswordWithOtp } from "../lib/supabase.js";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { Logo } from "../icons/CulturalIcons";

const IW = 1.5;

const ResetPasswordPage = ({ onNavigate }) => {
  const [step, setStep] = useState("email"); // "email" | "verify" | "new-password" | "success"
  const [email, setEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    setError(""); setMessage("");
    if (!email.trim()) { setError("请先输入邮箱地址"); return; }
    setLoading(true);
    try {
      const { data, error: err } = await sendOtp(email, "reset");
      if (err) {
        setError(err);
      } else {
        setStep("verify");
        setMessage("验证码已发送到您的邮箱，请查收");
        setOtpCountdown(60);
      }
    } catch (e) {
      setError("发送验证码失败，请重试");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setError(""); setMessage("");
    if (!verifyCode.trim()) { setError("请输入验证码"); return; }
    setLoading(true);
    try {
      const { data, error: err } = await verifyBrevoOtp(email, verifyCode, "reset");
      if (err) {
        setError(err);
      } else {
        setStep("new-password");
        setMessage("验证成功，请设置新密码");
      }
    } catch (e) {
      setError("验证失败，请重试");
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    setError(""); setMessage("");
    if (!newPassword.trim() || !confirmPwd.trim()) {
      setError("请填写新密码和确认密码");
      return;
    }
    if (newPassword !== confirmPwd) {
      setError("两次输入的密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setError("密码至少需要 6 位");
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await resetPasswordWithOtp(email, verifyCode, newPassword);
      if (err) {
        setError(err);
      } else {
        setStep("success");
        setMessage("密码重置成功！");
      }
    } catch (e) {
      setError("密码重置失败，请重试");
    }
    setLoading(false);
  };

  const handleBackToLogin = () => {
    if (onNavigate) {
      onNavigate("login");
    }
  };

  const containerStyle = {
    maxWidth: 430, margin: "0 auto", minHeight: "100vh",
    background: "var(--c-bg)", fontFamily: "var(--zh-font), var(--th-font), sans-serif",
    color: "var(--c-p800)", display: "flex", flexDirection: "column",
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: `1px solid ${"var(--c-p200)"}`, background: "var(--c-surface)",
    fontSize: 15, color: "var(--c-p800)", outline: "none",
    fontFamily: "var(--zh-font), sans-serif", boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const otpInputStyle = {
    ...inputStyle,
    textAlign: "center",
    fontSize: 20,
    letterSpacing: 8,
    fontWeight: 700,
  };

  const sendOtpButtonStyle = {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid var(--c-p400)",
    background: "var(--c-surface)",
    color: "var(--c-p600)",
    fontSize: 13,
    fontWeight: 600,
    cursor: otpCountdown > 0 || loading ? "not-allowed" : "pointer",
    opacity: otpCountdown > 0 || loading ? 0.6 : 1,
    fontFamily: "var(--zh-font), sans-serif",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  };

  return (
    <div style={containerStyle}>
      <div style={{ height: 44, flexShrink: 0 }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 28px", gap: 0 }}>
        {/* Back button */}
        <div style={{ marginBottom: 20 }}>
          <div
            onClick={handleBackToLogin}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "var(--c-p600)", cursor: "pointer",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} strokeWidth={IW} />
            返回登录
          </div>
        </div>

        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Logo size={40} color={"var(--c-p600)"} />
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--c-p900)", marginTop: 10, fontFamily: "var(--zh-font), serif", letterSpacing: 2 }}>
            重置密码
          </div>
          <div style={{ fontSize: 13, color: "var(--c-s400)", marginTop: 4 }}>
            通过邮箱验证码重置密码
          </div>
        </div>

        {/* Step 1: Enter email */}
        {step === "email" && (
          <>
            <div style={{ marginBottom: 12 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="请输入注册邮箱"
                onKeyDown={e => e.key === "Enter" && handleSendOtp()}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
                autoFocus
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12, color: "var(--c-err)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-errL)", borderRadius: 8, marginBottom: 4,
              }}>{error}</div>
            )}

            {/* Message */}
            {message && (
              <div style={{
                fontSize: 12, color: "var(--c-info)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-infoL)", borderRadius: 8, marginBottom: 4,
              }}>{message}</div>
            )}

            <button
              onClick={handleSendOtp}
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: "var(--c-p800)", color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "wait" : "pointer", marginTop: 8,
                fontFamily: "var(--zh-font), sans-serif", transition: "background 0.2s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "发送中..." : "发送验证码"}
            </button>
          </>
        )}

        {/* Step 2: Enter OTP */}
        {step === "verify" && (
          <>
            <div style={{ textAlign: "center", padding: "12px 16px", marginBottom: 16, borderRadius: 10, background: "var(--c-infoL)" }}>
              <div style={{ fontSize: 13, color: "var(--c-info)", fontWeight: 500 }}>
                验证码已发送到 <strong>{email}</strong>
              </div>
              <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 4 }}>
                请查收邮箱并输入6位验证码
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="请输入6位验证码"
                onKeyDown={e => e.key === "Enter" && handleVerify()}
                style={otpInputStyle}
                onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
                autoFocus
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12, color: "var(--c-err)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-errL)", borderRadius: 8, marginBottom: 4,
              }}>{error}</div>
            )}

            {/* Message */}
            {message && (
              <div style={{
                fontSize: 12, color: "var(--c-info)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-infoL)", borderRadius: 8, marginBottom: 4,
              }}>{message}</div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: "var(--c-p800)", color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "wait" : "pointer", marginTop: 8,
                fontFamily: "var(--zh-font), sans-serif", transition: "background 0.2s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "验证中..." : "验证"}
            </button>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--c-s400)" }}>没有收到？</span>
              <span
                onClick={() => { if (otpCountdown === 0) handleSendOtp(); }}
                style={{
                  fontSize: 12, color: otpCountdown > 0 ? "var(--c-s300)" : "var(--c-p600)",
                  fontWeight: 600, cursor: otpCountdown > 0 ? "not-allowed" : "pointer",
                  marginLeft: 4, opacity: otpCountdown > 0 ? 0.6 : 1,
                }}
              >
                重新发送{otpCountdown > 0 ? `(${otpCountdown}s)` : ""}
              </span>
            </div>
          </>
        )}

        {/* Step 3: Enter new password */}
        {step === "new-password" && (
          <>
            <div style={{ textAlign: "center", padding: "12px 16px", marginBottom: 16, borderRadius: 10, background: "var(--c-infoL)" }}>
              <div style={{ fontSize: 13, color: "var(--c-info)", fontWeight: 500 }}>
                验证成功，请设置新密码
              </div>
              <div style={{ fontSize: 11, color: "var(--c-s400)", marginTop: 4 }}>
                密码至少需要 6 位
              </div>
            </div>

            {/* New password */}
            <div style={{ marginBottom: 12, position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="新密码"
                onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
                autoFocus
              />
              <div onClick={() => setShowPwd(!showPwd)} style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                cursor: "pointer", display: "flex", alignItems: "center",
              }}>
                {showPwd
                  ? <EyeOff size={18} strokeWidth={IW} color={"var(--c-s400)"} />
                  : <Eye size={18} strokeWidth={IW} color={"var(--c-s400)"} />}
              </div>
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: 12, position: "relative" }}>
              <input
                type={showConfirmPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="确认新密码"
                onKeyDown={e => e.key === "Enter" && handleResetPassword()}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = "var(--c-p400)"}
                onBlur={e => e.target.style.borderColor = "var(--c-p200)"}
              />
              <div onClick={() => setShowConfirmPwd(!showConfirmPwd)} style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                cursor: "pointer", display: "flex", alignItems: "center",
              }}>
                {showConfirmPwd
                  ? <EyeOff size={18} strokeWidth={IW} color={"var(--c-s400)"} />
                  : <Eye size={18} strokeWidth={IW} color={"var(--c-s400)"} />}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 12, color: "var(--c-err)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-errL)", borderRadius: 8, marginBottom: 4,
              }}>{error}</div>
            )}

            {/* Message */}
            {message && (
              <div style={{
                fontSize: 12, color: "var(--c-info)", textAlign: "center", padding: "8px 12px",
                background: "var(--c-infoL)", borderRadius: 8, marginBottom: 4,
              }}>{message}</div>
            )}

            <button
              onClick={handleResetPassword}
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: "var(--c-p800)", color: "#fff", fontSize: 15, fontWeight: 600,
                cursor: loading ? "wait" : "pointer", marginTop: 8,
                fontFamily: "var(--zh-font), sans-serif", transition: "background 0.2s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "重置中..." : "重置密码"}
            </button>
          </>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <CheckCircle size={64} color="var(--c-success)" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-p900)", marginBottom: 8 }}>
                密码重置成功！
              </div>
              <div style={{ fontSize: 14, color: "var(--c-s400)", marginBottom: 24 }}>
                您的密码已成功更新，请使用新密码登录
              </div>
              <button
                onClick={handleBackToLogin}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                  background: "var(--c-p800)", color: "#fff", fontSize: 15, fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--zh-font), sans-serif", transition: "background 0.2s",
                }}
              >
                返回登录
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "auto", paddingBottom: 28, paddingTop: 20 }}>
          <span style={{ fontSize: 11, color: "var(--c-s300)" }}>
            词笺 · 中泰双语智能词典
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
