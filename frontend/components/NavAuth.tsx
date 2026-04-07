"use client";

import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useProStatus } from "@/hooks/useProStatus";

const avatarAppearance = {
  elements: {
    avatarBox: "w-9 h-9 ring-2 ring-offset-2 ring-offset-[#0a1628]",
  },
};

export function NavAuth() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#7a8fa3] hidden sm:block">
          Bonjour,{" "}
          <span className="text-white font-semibold">
            {user.firstName || user.emailAddresses[0]?.emailAddress}
          </span>
        </span>
        <UserButton appearance={avatarAppearance}  />
      </div>
    );
  }

  return (
    <>
      <SignInButton mode="redirect">
        <button
          className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          style={{
            border: "1px solid rgba(108,92,231,0.4)",
            color: "var(--accent-primary)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,92,231,0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ""; }}
        >
          Se connecter
        </button>
      </SignInButton>
      <button
        onClick={() => router.push("/sign-up")}
        className="text-[#0a1628] font-bold text-sm px-5 py-2.5 rounded-lg transition-all duration-200"
        style={{ background: "linear-gradient(to right, var(--accent-primary), #8b7cf8)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(108,92,231,0.4)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ""; }}
      >
        Commencer gratuitement
      </button>
    </>
  );
}

export function NavAuthCompact() {
  const { isSignedIn, user } = useUser();
  const { isPro, loading: proLoading } = useProStatus(user?.id);

  if (isSignedIn) {

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium hidden md:block" style={{ color: "var(--accent-primary)" }}>
          {user?.firstName}
        </span>
        {isPro && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full text-[#0a1628]" style={{ background: "var(--accent-gold, var(--accent-primary))" }}>
            PRO
          </span>
        )}
        <UserButton appearance={avatarAppearance}  />
      </div>
    );
  }

  return (
    <SignInButton mode="redirect">
      <button
        className="text-xs font-bold px-3 py-2 rounded-lg transition-all whitespace-nowrap"
        style={{
          border: "1px solid rgba(108,92,231,0.4)",
          color: "var(--accent-primary)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,92,231,0.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = ""; }}
      >
        Se connecter
      </button>
    </SignInButton>
  );
}
