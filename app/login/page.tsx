import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <LoginForm googleEnabled={googleEnabled} />
    </main>
  );
}
