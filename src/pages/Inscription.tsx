import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useTranslation } from "react-i18next";

export default function Inscription() {
  const { t } = useTranslation();
  return (
    <AuthLayout
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
    >
      <SignUpForm />
    </AuthLayout>
  );
}
