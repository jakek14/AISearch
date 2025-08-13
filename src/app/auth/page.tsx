"use client";

import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Auth } from "@supabase/auth-ui-react";
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  if (!supabase) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
        Supabase is not configured.
      </div>
    );
  }
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>
      <div className="rounded border bg-white p-4">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          view="sign_in"
        />
      </div>
    </div>
  );
} 