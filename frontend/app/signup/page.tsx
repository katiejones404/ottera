"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { registerUser } from "@/app/lib/api";
import { saveSession, toStoredSession } from "@/app/lib/session";

const ROLE_OPTIONS = [
  { value: "person_in_need", label: "Person in Need" },
  { value: "clothes_donor", label: "Clothes Donor" },
  { value: "volunteer", label: "Volunteer" },
  { value: "nonprofit_employee", label: "Nonprofit Employee" },
];

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<string[]>(["person_in_need"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggleRole = (role: string) => {
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (roles.length === 0) {
      setError("Choose at least one role.");
      return;
    }

    try {
      setLoading(true);
      const result = await registerUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        birthday: birthday || undefined,
        zip_code: zipCode.trim() || undefined,
        phone: phone.trim() || undefined,
        roles,
      });

      saveSession(toStoredSession(result));
      router.push("/?page=resources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="signup-main">
      <section className="signup-card">
        <p className="eyebrow">Create account</p>
        <h1>Join Ottera</h1>
        <p>Register once and choose one or more roles for how you use the app.</p>

        <form className="signup-form" onSubmit={onSubmit}>
          <label>
            First Name
            <input
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>

          <label>
            Last Name
            <input
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>

          <label>
            Username
            <input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label>
            Birthday
            <input
              type="date"
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
            />
          </label>

          <label>
            Zip Code
            <input value={zipCode} onChange={(event) => setZipCode(event.target.value)} />
          </label>

          <label>
            Phone (optional)
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>

          <fieldset className="role-fieldset">
            <legend>Roles</legend>
            {ROLE_OPTIONS.map((role) => (
              <label key={role.value} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={roles.includes(role.value)}
                  onChange={() => toggleRole(role.value)}
                />
                {role.label}
              </label>
            ))}
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="solid" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="signup-links">
          <Link href="/">Back to home</Link>
        </p>
      </section>
    </main>
  );
}
