"use client";

import { useEffect, useState } from "react";

export default function RelojEnVivo({ className }: { className?: string }) {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const horaTexto = ahora.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return <span className={className}>{horaTexto}</span>;
}
