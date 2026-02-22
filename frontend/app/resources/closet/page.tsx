"use client";
import { useRouter } from "next/navigation";
import ClothingMarketplace from "../../components/ClothingMarketplace";
import { useState } from "react";

export default function ClosetPage() {
  const router = useRouter();
  const [openChatsWithUser, setOpenChatsWithUser] = useState<string | null>(null);

  const handleMessageSeller = (username: string) => {
    // Store the username in sessionStorage so ChatsPopup can pick it up
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ottera_open_dm", username);
      window.dispatchEvent(new CustomEvent("ottera:open_dm", { detail: { username } }));
    }
    setOpenChatsWithUser(username);
  };

  return (
    <div className="partner-main">
      <div style={{ padding: "0.75rem 1.5rem" }}>
        <button className="btn" onClick={() => router.back()} style={{ marginBottom: "1rem" }}>
          ← Back
        </button>
      </div>
      <ClothingMarketplace onMessageSeller={handleMessageSeller} />
      {openChatsWithUser && (
        <p style={{ display: "none" }}>{openChatsWithUser}</p>
      )}
    </div>
  );
}
