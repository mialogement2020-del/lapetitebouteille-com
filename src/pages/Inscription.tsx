import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function Inscription() {
  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez PrestigeVins et profitez de nos offres exclusives"
    >
      <SignUpForm />
    </AuthLayout>
  );
}
