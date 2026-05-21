import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useTranslation } from "react-i18next";

export default function Connexion() {
  const { t } = useTranslation();
  return (
    <AuthLayout
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
    >
      <LoginForm />
    </AuthLayout>
  );
}
