"use client";

import dynamic from 'next/dynamic';

// dynamically import your existing LoginForm component, client‑only
const LoginForm = dynamic(
  () => import('@/components/LoginForm'),
  { ssr: false }
);

export default function ClientLoginForm() {
  return <LoginForm />;
}
