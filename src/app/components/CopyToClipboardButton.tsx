"use client";

import { useState, useCallback } from "react";

interface CopyToClipboardButtonProps {
  textToCopy: string;
  buttonText?: string; // Optional button text, defaults to "Copy"
  className?: string; // Optional class name for styling
  style?: React.CSSProperties; // Optional inline styles
}

export function CopyToClipboardButton({ textToCopy, buttonText = "Copy", className, style }: CopyToClipboardButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset "Copied!" message after 2 seconds
    } catch (err) {
      console.error("Failed to copy:", err);
      // Optionally, provide user feedback for failure
    }
  }, [textToCopy]);

  return (
    <button onClick={handleCopy} disabled={copied} className={className} style={style}>
      {copied ? "Copied!" : buttonText}
    </button>
  );
}
