import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export default function Connexion() {
  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à votre compte PrestigeVins"
    >
      <LoginForm />
    </AuthLayout>
  );
}
