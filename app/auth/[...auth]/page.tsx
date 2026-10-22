import { AuthView } from "@neondatabase/auth-ui";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ auth: string[] }>;
}) {
  const { auth: pathSegments } = await params;
  const path = pathSegments?.[0] || "sign-in";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex items-center gap-1.5 font-mono text-sm font-semibold tracking-tight">
        <span className="text-accent text-base leading-none">◈</span>
        <span className="text-foreground">cartograph</span>
      </div>
      <div className="w-full max-w-sm">
        <AuthView path={path} />
      </div>
    </div>
  );
}
