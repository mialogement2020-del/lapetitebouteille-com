import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useTranslation } from "react-i18next";
import Seo from "@/components/seo/Seo";

export default function Inscription() {
  const { t } = useTranslation();
  return (
    <AuthLayout
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
    >
      <Seo title={"Inscription | La Petite Bouteille"} description={"Créez votre compte La Petite Bouteille et profitez d'avantages exclusifs sur les vins et spiritueux au Cameroun."} path={"/inscription"} />
      <SignUpForm />
    </AuthLayout>
  );
}
