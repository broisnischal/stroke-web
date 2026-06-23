import { SiGithub, SiGoogle } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";

import { SignInSocialButton } from "#/components/sign-in-social-button";
import { StrokeIcon } from "#/components/stroke-icon";

export const Route = createFileRoute("/_guest/login")({
  component: AuthPage,
});

function AuthPage() {
  const { redirectUrl } = Route.useRouteContext();

  return (
    <div className="flex h-svh items-center justify-center overflow-hidden bg-background px-4">
      <div className="flex w-full max-w-[320px] flex-col items-center gap-8">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <StrokeIcon className="size-6" />
          <span className="text-sm font-medium">Stroke</span>
        </Link>

        <div className="flex w-full flex-col gap-2">
          <SignInSocialButton
            provider="github"
            callbackURL={redirectUrl}
            icon={<SiGithub className="size-4" />}
          />
          <SignInSocialButton
            provider="google"
            callbackURL={redirectUrl}
            icon={<SiGoogle className="size-4" />}
          />
        </div>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing, you agree to our terms of service.
          <br />
          New accounts are created automatically.
        </p>
      </div>
    </div>
  );
}
