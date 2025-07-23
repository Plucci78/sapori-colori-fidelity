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
      className="dark-mode-toggle"
      onClick={() => setDark((d) => !d)}
      title={dark ? "Attiva modalità chiara" : "Attiva modalità scura"}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
};

export default DarkModeToggle;