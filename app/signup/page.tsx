import Nav from "@/components/Nav";
import AuthForm from "@/components/auth/AuthForm";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/dashboard";

  return (
    <>
      <Nav />
      <main className="auth-page">
        <AuthForm mode="signup" next={next} initialError={params.error} />
      </main>
    </>
  );
}
