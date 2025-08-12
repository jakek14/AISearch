"use client";
import { useState } from "react";
import type { ProviderName } from "@/lib/providers";

type Props = { promptId: string };

type RunResponse = {
  run: { id: string; provider: string; model: string; status: string };
  answer: { id: string; text: string };
  citations: { url: string; domain: string; title?: string | null; rankHint?: number | null }[];
};

export default function RunClient() {
  return null;
} 