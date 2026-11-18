import { demoEnabled, demoPassword } from "@/lib/demo";
import { LoginScreen } from "./LoginForm";

export const dynamic = "force-dynamic";

/** La pagina legge sul server se la demo è attiva, così la password demo compare solo quando funziona. */
export default function LoginPage() {
  return <LoginScreen demoPassword={demoEnabled() ? demoPassword() : null} />;
}
