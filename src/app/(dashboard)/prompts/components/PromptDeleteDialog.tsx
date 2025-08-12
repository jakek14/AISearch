"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PromptDeleteDialog({
  id,
  text,
  onDelete,
}: {
  id: string;
  text: string;
  onDelete: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function viewAnswer() {
    const url = new URL(window.location.href);
    url.searchParams.set("view", id);
    window.location.href = url.toString();
  }

  function handleDelete() {
    setError(null);
    const form = formRef.current;
    if (!form) return;
    start(async () => {
      try {
        form.requestSubmit();
        // Wait a tick so the navigation/cache can update
        setTimeout(() => {
          setOpen(false);
          router.refresh();
        }, 50);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-left text-gray-900 underline underline-offset-2">
        {text}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
            <div className="mb-2 text-sm text-gray-600">Prompt</div>
            <div className="mb-4 text-gray-900">{text}</div>
            {error && <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <form ref={formRef} action={onDelete} className="hidden">
              <input type="hidden" name="id" value={id} />
            </form>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={viewAnswer} className="rounded border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
                View answer
              </button>
              <button
                onClick={handleDelete}
                disabled={pending}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 