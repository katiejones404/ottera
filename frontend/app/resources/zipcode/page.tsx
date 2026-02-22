"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "../../lib/session";

export default function ZipcodeGatePage() {
  const router = useRouter();
  const session = loadSession();
  const [zip, setZip] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = zip.replace(/\D/g, "").slice(0, 5);
    if (!/^\d{5}$/.test(normalized)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    setError(null);
    router.push(`/resources?zip=${normalized}`);
  };

  return (
    <main className="zip-gate-main">
      <section className="zip-gate-card">
        <p className="eyebrow">Find Nearby Help</p>
        <h1>Please enter your ZIP code</h1>
        <p>We will use it to show pantry, closet, and shelter resources near you.</p>

        <form className="zip-gate-form" onSubmit={onSubmit}>
          <label htmlFor="guest-zip">ZIP code</label>
          <input
            id="guest-zip"
            inputMode="numeric"
            maxLength={5}
            placeholder={session?.zipCode ? `Example: ${session.zipCode}` : "Example: 27601"}
            value={zip}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="solid">
            Continue to Resources
          </button>
        </form>
      </section>
    </main>
  );
}
