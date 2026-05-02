"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const WORDS = ["Bank", "Fintech", "Insurer"];

export function RotatingWord() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % WORDS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block relative align-baseline"
      style={{ minWidth: "8ch" }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: "0.4em" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-0.4em" }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-stone-400"
        >
          {WORDS[idx]}.
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
