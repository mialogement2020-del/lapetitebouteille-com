import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { useTranslation } from "react-i18next";
import Seo from "@/components/seo/Seo";

export default function Connexion() {
  const { t } = useTranslation();
  return (
    <AuthLayout
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
    >
      <Seo title={"Connexion | La Petite Bouteille"} description={"Connectez-vous à votre compte La Petite Bouteille pour commander vins et spiritueux au Cameroun."} path={"/connexion"} />
      <LoginForm />
    </AuthLayout>
  );
}
