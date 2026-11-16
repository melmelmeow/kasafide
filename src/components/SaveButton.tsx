"use client";

import { useState, useTransition } from "react";
import { toggleSavePropertyAction } from "@/app/buyer/actions";

interface SaveButtonProps {
  propertyId: string;
  initiallySaved?: boolean;
  initialSaved?: boolean;
  className?: string;
}

export function SaveButton({
  propertyId,
  initiallySaved,
  initialSaved,
  className = "",
}: SaveButtonProps) {
  const [saved, setSaved] = useState(initiallySaved ?? initialSaved ?? false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic toggle
    const nextSaved = !saved;
    setError("");
    setSaved(nextSaved);

    startTransition(async () => {
      try {
        const res = await toggleSavePropertyAction(propertyId);
        if (res.error) {
          setSaved(!nextSaved);
          setError(res.error);
        } else {
          setSaved(res.saved);
        }
      } catch {
        setSaved(!nextSaved);
        setError("The listing could not be updated. Please try again.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={saved ? "Remove from saved" : "Save property"}
        title={error || undefined}
        className={`save-btn inline-flex items-center justify-center rounded-full p-2 transition-colors ${
          saved
            ? "bg-primary text-white"
            : "bg-surface-soft text-text-muted hover:text-primary"
        } ${className}`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      {error && <span role="alert" className="save-error">{error}</span>}
    </>
  );
}
