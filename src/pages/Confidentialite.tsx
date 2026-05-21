import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function Confidentialite() {
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
              {t("privacy.title")}
            </h1>

            <div className="prose prose-invert prose-gold max-w-none space-y-8">
              <p className="text-cream/70 text-lg">{t("legal.lastUpdated", { date })}</p>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s1Title")}</h2>
                <p className="text-cream/70">{t("privacy.s1Body")}</p>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s2Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("privacy.s2Intro")}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong className="text-cream">{t("privacy.s2I1Label")}</strong> {t("privacy.s2I1Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s2I2Label")}</strong> {t("privacy.s2I2Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s2I3Label")}</strong> {t("privacy.s2I3Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s2I4Label")}</strong> {t("privacy.s2I4Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s2I5Label")}</strong> {t("privacy.s2I5Body")}</li>
                  </ul>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s3Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("privacy.s3Intro")}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{t("privacy.s3L1")}</li>
                    <li>{t("privacy.s3L2")}</li>
                    <li>{t("privacy.s3L3")}</li>
                    <li>{t("privacy.s3L4")}</li>
                    <li>{t("privacy.s3L5")}</li>
                    <li>{t("privacy.s3L6")}</li>
                    <li>{t("privacy.s3L7")}</li>
                  </ul>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s4Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("privacy.s4Intro")}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{t("privacy.s4L1")}</li>
                    <li>{t("privacy.s4L2")}</li>
                    <li>{t("privacy.s4L3")}</li>
                    <li>{t("privacy.s4L4")}</li>
                    <li>{t("privacy.s4L5")}</li>
                  </ul>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s5Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("privacy.s5Intro")}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong className="text-cream">{t("privacy.s5L1Label")}</strong> {t("privacy.s5L1Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s5L2Label")}</strong> {t("privacy.s5L2Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s5L3Label")}</strong> {t("privacy.s5L3Body")}</li>
                  </ul>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s6Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("privacy.s6Intro")}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{t("privacy.s6L1")}</li>
                    <li>{t("privacy.s6L2")}</li>
                    <li>{t("privacy.s6L3")}</li>
                    <li>{t("privacy.s6L4")}</li>
                  </ul>
                  <p className="mt-4">{t("privacy.s6Outro")}</p>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s7Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("privacy.s7Intro")}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li><strong className="text-cream">{t("privacy.s7L1Label")}</strong> {t("privacy.s7L1Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s7L2Label")}</strong> {t("privacy.s7L2Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s7L3Label")}</strong> {t("privacy.s7L3Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s7L4Label")}</strong> {t("privacy.s7L4Body")}</li>
                    <li><strong className="text-cream">{t("privacy.s7L5Label")}</strong> {t("privacy.s7L5Body")}</li>
                  </ul>
                  <p className="mt-4">{t("privacy.s7Outro")}</p>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s8Title")}</h2>
                <div className="space-y-4 text-cream/70">
                  <p>{t("privacy.s8Intro")}</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>{t("privacy.s8L1")}</li>
                    <li>{t("privacy.s8L2")}</li>
                    <li>{t("privacy.s8L3")}</li>
                  </ul>
                </div>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s9Title")}</h2>
                <p className="text-cream/70">{t("privacy.s9Body")}</p>
              </section>

              <section className="bg-cream/5 rounded-xl p-6 border border-cream/10">
                <h2 className="font-display text-2xl text-primary mb-4">{t("privacy.s10Title")}</h2>
                <p className="text-cream/70">{t("privacy.s10Intro")}</p>
                <ul className="list-none space-y-2 mt-4 text-cream/70">
                  <li>{t("privacy.s10Email")}</li>
                  <li>{t("privacy.s10Phone")}</li>
                  <li>{t("privacy.s10Address")}</li>
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