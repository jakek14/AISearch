"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PromptDeleteDialog({
  id,
  text,
  onDelete,
  checkboxTrigger,
}: {
  id: string;
  text: string;
  onDelete: (formData: FormData) => Promise<void>;
  checkboxTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  function viewAnswer() {
    const url = new URL(window.location.href);
    url.searchParams.set("view", id);
    window.location.href = url.toString();
  }

  function close() {
    setOpen(false);
    // Uncheck the checkbox trigger if present
    if (checkboxRef.current) checkboxRef.current.checked = false;
  }

  function handleDelete() {
    setError(null);
    const form = formRef.current;
    if (!form) return;
    start(async () => {
      try {
        form.requestSubmit();
        setTimeout(() => {
          close();
          router.refresh();
        }, 50);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <>
      {checkboxTrigger ? (
        <input
          ref={checkboxRef}
          type="checkbox"
          aria-label="Select row"
          onChange={(e) => {
            if (e.target.checked) setOpen(true);
          }}
        />
      ) : (
        <button onClick={() => setOpen(true)} className="text-left text-gray-900 underline underline-offset-2">
          {text}
        </button>
      )}
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
              <button onClick={close} className="rounded border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50">
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