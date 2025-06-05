import { useEffect, useState } from "react";

const DarkModeToggle = () => {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined"
      ? document.body.classList.contains("dark")
      : false
  );

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      className="btn btn-secondary"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 1000,
        border: "2px solid var(--brand-primary)",
      }}
      onClick={() => setDark((d) => !d)}
    >
      {dark ? "☀️ Modalità Chiara" : "🌙 Modalità Scura"}
    </button>
  );
};

export default DarkModeToggle;