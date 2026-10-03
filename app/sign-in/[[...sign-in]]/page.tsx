import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex items-center gap-1.5 font-mono text-sm font-semibold tracking-tight">
        <span className="text-accent text-base leading-none">◈</span>
        <span className="text-foreground">cartograph</span>
      </div>
      <SignIn />
    </div>
  );
}
