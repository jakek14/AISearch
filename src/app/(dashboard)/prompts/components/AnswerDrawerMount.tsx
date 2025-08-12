"use client";
import { useEffect, useState } from "react";
import AnswerDrawer from "./AnswerDrawer";

export default function AnswerDrawerMount({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [promptId, setPromptId] = useState(id);
  useEffect(() => {
    setPromptId(id);
    setOpen(Boolean(id));
  }, [id]);
  if (!id) return null;
  return <AnswerDrawer promptId={promptId} open={open} onClose={() => (window.location.href = window.location.pathname)} />;
} 