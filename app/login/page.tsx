import Dock from "../../components/Dock";
import LoginForm from "../../components/LoginForm";
import WindowLight from "../../components/ContourTide";

export const metadata = {
  title: "Sign in | raided.cc",
};

export default function LoginPage() {
  return (
    <>
      <WindowLight
        className="tides"
        style={{ position: "absolute" }}
        clickRipples={false}
      />
      <main>
        <section className="snap auth">
          <LoginForm />
        </section>
      </main>
      <Dock />
    </>
  );
}
