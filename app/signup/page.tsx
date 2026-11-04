import Dock from "../../components/Dock";
import SignupForm from "../../components/SignupForm";
import WindowLight from "../../components/ContourTide";

export const metadata = {
  title: "Sign up | raided.cc",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ username?: string }>;
}) {
  const { username } = await searchParams;

  return (
    <>
      <WindowLight
        className="tides"
        style={{ position: "absolute" }}
        clickRipples={false}
      />
      <main>
        <section className="snap auth">
          <SignupForm initialUsername={username ?? ""} />
        </section>
      </main>
      <Dock />
    </>
  );
}
