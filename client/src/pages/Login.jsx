import { useContext, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Login() {
  const { user, login, register } = useContext(AuthContext);
  const location = useLocation();

  // "login" or "signup": the same page does both
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already logged in (or just logged in): leave this page.
  // Admins go to the admin panel, customers go back to where they came from.
  if (user) {
    const back = location.state && location.state.from ? location.state.from : "/";
    return <Navigate to={user.role === "admin" ? "/admin" : back} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ name, email, phone, password });
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
  }

  const isSignup = mode === "signup";

  return (
    <section className="auth-page">
      <div className="page-heading">
        <span className="page-script">Welcome</span>
        <h1>{isSignup ? "Sign up" : "Log in"}</h1>
      </div>

      <div className="auth-card">
        <div className="tab-row" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            className={!isSignup ? "tab-btn active" : "tab-btn"}
            onClick={() => switchMode("login")}
          >
            LOG IN
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            className={isSignup ? "tab-btn active" : "tab-btn"}
            onClick={() => switchMode("signup")}
          >
            SIGN UP
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <label className="field">
              Your name
              <input
                type="text"
                required
                maxLength={80}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}

          <label className="field">
            Email
            <input
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {isSignup && (
            <label className="field">
              Phone number
              <input
                type="tel"
                maxLength={20}
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
          )}

          <label className="field">
            Password
            <input
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              maxLength={72}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {isSignup && <p className="form-note">At least 8 characters.</p>}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="place-btn" disabled={busy}>
            {busy ? "PLEASE WAIT..." : isSignup ? "CREATE ACCOUNT" : "LOG IN"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Login;
