"use client";

import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useProStatus } from "@/hooks/useProStatus";

const avatarAppearance = {
  elements: {
    avatarBox: "w-9 h-9 ring-2 ring-[#C9A84C] ring-offset-2 ring-offset-[#0a1628]",
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
        <button className="text-sm font-semibold border border-[rgba(201,168,76,0.4)] text-[#C9A84C] px-4 py-2 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">
          Se connecter
        </button>
      </SignInButton>
      <button
        onClick={() => router.push("/sign-up")}
        className="bg-gradient-to-r from-[#C9A84C] to-[#e8c55a] text-[#0a1628] font-bold text-sm px-5 py-2.5 rounded-lg hover:shadow-[0_4px_20px_rgba(201,168,76,0.4)] transition-all duration-200"
      >
        Commencer gratuitement
      </button>
    </>
  );
}

export function NavAuthCompact() {
  const { isSignedIn, user } = useUser();
  const { isPro } = useProStatus(user?.id);

  if (isSignedIn) {

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#C9A84C] font-medium hidden md:block">
          {user?.firstName}
        </span>
        {isPro && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C9A84C] text-[#0a1628]">
            PRO
          </span>
        )}
        <UserButton appearance={avatarAppearance}  />
      </div>
    );
  }

  return (
    <SignInButton mode="redirect">
      <button className="text-xs font-bold border border-[rgba(201,168,76,0.4)] text-[#C9A84C] px-3 py-2 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all whitespace-nowrap">
        Se connecter
      </button>
    </SignInButton>
  );
}
