"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createQrPaymentAction, getPaymentStatusAction } from "@/app/api/payments/qr-actions";

type QrPaymentModalProps = {
  propertyId: string;
  propertyTitle: string;
  initialAmount?: number;
  purpose?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (paymentId: string) => void;
};

export function QrPaymentModal({
  propertyId,
  propertyTitle,
  initialAmount,
  purpose = "rent",
  isOpen,
  onClose,
  onSuccess,
}: QrPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrData, setQrData] = useState<{
    paymentId: string;
    amount: number;
    qrString: string;
    qrImageDataUrl?: string;
    expiresAt: string;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate QR on modal open
  useEffect(() => {
    if (isOpen && !qrData && !loading) {
      generateQr();
    }
    if (!isOpen) {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen]);

  const cleanup = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const generateQr = async () => {
    setLoading(true);
    setError("");
    cleanup();

    try {
      const res = await createQrPaymentAction({
        propertyId,
        purpose,
      });

      if (!res.success || !res.paymentId || !res.qrString) {
        setError(res.error || "Failed to generate QR Ph code.");
        setLoading(false);
        return;
      }

      setQrData({
        paymentId: res.paymentId,
        amount: res.amount || 0,
        qrString: res.qrString,
        qrImageDataUrl: res.qrImageDataUrl,
        expiresAt: res.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

      const seconds = Math.max(0, Math.floor((new Date(res.expiresAt!).getTime() - Date.now()) / 1000));
      setTimeLeft(seconds);

      // Start short polling for status
      startPolling(res.paymentId);
    } catch {
      setError("An unexpected error occurred while generating payment.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentId: string) => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await getPaymentStatusAction(paymentId);
        if (res.isPaid) {
          setIsPaid(true);
          cleanup();
          if (onSuccess) onSuccess(paymentId);
        }
      } catch (err) {
        console.error("Payment status poll error:", err);
      }
    }, 3000);
  };

  // Expiry countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || isPaid) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          cleanup();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isPaid]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft === 0 && !isPaid;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "420px",
          padding: "24px",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
          position: "relative",
          textAlign: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "22px",
            cursor: "pointer",
            color: "#6b7280",
          }}
        >
          &times;
        </button>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
          QR Ph Payment
        </h2>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
          Scan using any banking app or e-wallet (GCash, Maya, BDO, BPI)
        </p>

        {loading && (
          <div style={{ padding: "40px 0" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                border: "3px solid #e5e7eb",
                borderTopColor: "var(--primary, #5B3A8E)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            <p style={{ fontSize: "14px", color: "#4b5563" }}>Generating secure QR Ph code…</p>
          </div>
        )}

        {error && (
          <div style={{ padding: "20px 0" }}>
            <p style={{ color: "#dc2626", fontSize: "14px", marginBottom: "16px" }}>{error}</p>
            <button
              onClick={generateQr}
              style={{
                backgroundColor: "var(--primary, #5B3A8E)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {qrData && !loading && !error && (
          <div>
            <div
              style={{
                backgroundColor: "#f9fafb",
                padding: "12px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#6b7280" }}>Property:</span>
                <span style={{ fontWeight: 600, color: "#111827" }}>{propertyTitle}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6b7280" }}>Amount Due:</span>
                <span style={{ fontWeight: 700, color: "#5B3A8E", fontSize: "15px" }}>
                  ₱{qrData.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {isPaid ? (
              <div style={{ padding: "24px 0" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#dcfce7",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    margin: "0 auto 12px",
                  }}
                >
                  ✓
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#16a34a", marginBottom: "6px" }}>
                  Payment Confirmed!
                </h3>
                <p style={{ fontSize: "13px", color: "#4b5563", marginBottom: "16px" }}>
                  Your payment has been successfully verified via Xendit.
                </p>
                <button
                  onClick={onClose}
                  style={{
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Done
                </button>
              </div>
            ) : isExpired ? (
              <div style={{ padding: "20px 0" }}>
                <p style={{ color: "#dc2626", fontWeight: 600, marginBottom: "12px" }}>
                  This QR code has expired.
                </p>
                <button
                  onClick={generateQr}
                  style={{
                    backgroundColor: "var(--primary, #5B3A8E)",
                    color: "#ffffff",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Generate New QR
                </button>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    margin: "12px 0",
                  }}
                >
                  {qrData.qrImageDataUrl ? (
                    <Image
                      src={qrData.qrImageDataUrl}
                      alt="QR Ph Code"
                      width={240}
                      height={240}
                      style={{
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                      }}
                      unoptimized
                    />
                  ) : (
                    <textarea
                      readOnly
                      value={qrData.qrString}
                      style={{
                        width: "100%",
                        height: "100px",
                        fontFamily: "monospace",
                        fontSize: "11px",
                        padding: "8px",
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    marginBottom: "16px",
                  }}
                >
                  <span>Expires in:</span>
                  <span style={{ fontWeight: 700, color: timeLeft < 120 ? "#dc2626" : "#111827" }}>
                    {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#4b5563",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                  Waiting for payment scan…
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
