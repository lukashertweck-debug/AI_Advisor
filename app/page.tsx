import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Dashboard
      userEmail={session.user.email ?? ""}
      userName={session.user.name ?? ""}
    />
  );
}
