import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function Conditions() {
  const { t, i18n } = useTranslation();
  const date = new Date().toLocaleDateString(i18n.language === "en" ? "en-US" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-noir">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-cream mb-8">
              {t("terms.title")}
            </h1>

            <div className="prose prose-invert prose-gold max-w-none space-y-8">
              <p className="text-cream/70 text-lg">{t("legal.lastUpdated", { date })}</p>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s1Title")}</h2>
                <p className="text-cream/70">{t("terms.s1Body")}</p>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s2Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p><strong className="text-cream">{t("terms.s2AgeLabel")}</strong> {t("terms.s2AgeBody")}</p>
                  <p><strong className="text-cream">{t("terms.s2AccountLabel")}</strong> {t("terms.s2AccountBody")}</p>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s3Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p><strong className="text-cream">{t("terms.s3ProcessLabel")}</strong> {t("terms.s3ProcessBody")}</p>
                  <p><strong className="text-cream">{t("terms.s3MethodsLabel")}</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>{t("terms.s3Method1")}</li>
                    <li>{t("terms.s3Method2")}</li>
                    <li>{t("terms.s3Method3")}</li>
                  </ul>
                  <p><strong className="text-cream">{t("terms.s3PriceLabel")}</strong> {t("terms.s3PriceBody")}</p>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s4Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p><strong className="text-cream">{t("terms.s4ZonesLabel")}</strong> {t("terms.s4ZonesBody")}</p>
                  <p><strong className="text-cream">{t("terms.s4TimeLabel")}</strong> {t("terms.s4TimeBody")}</p>
                  <p><strong className="text-cream">{t("terms.s4FeesLabel")}</strong> {t("terms.s4FeesBody")}</p>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s5Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("terms.s5Intro")}</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>{t("terms.s5L1")}</li>
                    <li>{t("terms.s5L2")}</li>
                    <li>{t("terms.s5L3")}</li>
                  </ul>
                  <p>{t("terms.s5Withdraw")}</p>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s6Title")}</h2>
                <p className="text-cream/70">{t("terms.s6Body")}</p>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s7Title")}</h2>
                <p className="text-cream/70">{t("terms.s7Body")}</p>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("terms.s8Title")}</h2>
                <p className="text-cream/70">{t("terms.s8Intro")}</p>
                <ul className="list-none space-y-2 mt-4 text-cream/70">
                  <li>{t("terms.s8Email")}</li>
                  <li>{t("terms.s8Phone")}</li>
                  <li>{t("terms.s8Address")}</li>
                </ul>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}