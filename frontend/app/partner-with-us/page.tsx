"use client";

import { FormEvent, useState } from "react";
import { submitPartnerApplication } from "../lib/api";

export default function PartnerWithUsPage() {
  const [clientName, setClientName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [zipCodesRaw, setZipCodesRaw] = useState("");
  const [focusArea, setFocusArea] = useState<"food" | "shelter" | "clothing" | "healthcare" | "miscellaneous">("food");
  const [adminUsersRaw, setAdminUsersRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const zipCodes = zipCodesRaw
      .split(",")
      .map((item) => item.replace(/\D/g, "").slice(0, 5))
      .filter((item) => item.length === 5);

    const requestedAdminUsernames = adminUsersRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!clientName.trim() || !description.trim()) {
      setError("Organization name and description are required.");
      return;
    }

    setSubmitting(true);
    try {
      await submitPartnerApplication({
        client_name: clientName.trim(),
        website: website.trim() || undefined,
        description: description.trim(),
        distribution_schedule: schedule.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        addresses:
          addressLine.trim() || city.trim() || stateCode.trim()
            ? [{ line1: addressLine.trim(), city: city.trim(), state: stateCode.trim(), zip: zipCodes[0] || "" }]
            : [],
        zip_codes: zipCodes,
        focus_area: focusArea,
        requested_admin_usernames: requestedAdminUsernames,
      });
      setSuccess("Application submitted. An admin will review it before posting is enabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="partner-main">
      <section className="partner-card">
        <p className="eyebrow">For Nonprofits</p>
        <h1>Partner with Us</h1>
        <p>Submit your organization details. Once approved by an admin, you can post food/shelter distributions.</p>

        <form className="partner-form" onSubmit={onSubmit}>
          <label>
            Organization Name
            <input required value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </label>
          <label>
            Website URL
            <input type="url" placeholder="https://example.org" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <label>
            What you do
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label>
            Distribution Schedule
            <input placeholder="e.g. Tue/Thu 10 AM - 2 PM" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </label>
          <label>
            Contact Email
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </label>
          <label>
            Contact Phone
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </label>
          <label>
            Street Address
            <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
          </label>
          <div className="partner-row">
            <label>
              City
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label>
              State
              <input value={stateCode} onChange={(e) => setStateCode(e.target.value.toUpperCase())} />
            </label>
          </div>
          <label>
            ZIP Codes Served (comma-separated)
            <input placeholder="27601, 27603, 27701" value={zipCodesRaw} onChange={(e) => setZipCodesRaw(e.target.value)} />
          </label>
          <label>
            Focus Area
            <select value={focusArea} onChange={(e) => setFocusArea(e.target.value as typeof focusArea)}>
              <option value="food">Food</option>
              <option value="shelter">Shelter</option>
              <option value="clothing">Clothing</option>
              <option value="healthcare">Healthcare</option>
              <option value="miscellaneous">Miscellaneous</option>
            </select>
          </label>
          <label>
            Allowed Admin Usernames (comma-separated)
            <input placeholder="jane_admin, tom_admin" value={adminUsersRaw} onChange={(e) => setAdminUsersRaw(e.target.value)} />
          </label>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <button className="solid" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </section>
    </main>
  );
}
