import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wine } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-noir flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            <Wine className="h-10 w-10 text-primary" />
            <span className="font-display text-2xl font-bold text-cream">
              Prestige<span className="text-primary">Vins</span>
            </span>
          </Link>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-cream mb-2">
              {title}
            </h1>
            <p className="text-cream/60">{subtitle}</p>
          </div>

          {/* Form content */}
          {children}
        </div>
      </div>

      {/* Right side - Decorative image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-noir via-secondary/50 to-noir" />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
              <Wine className="w-16 h-16 text-noir" />
            </div>
            <h2 className="font-display text-4xl font-bold text-cream mb-4">
              {t("authLayout.headline")}
            </h2>
            <p className="text-cream/70 text-lg max-w-sm mx-auto">
              {t("authLayout.tagline")}
            </p>
            <div className="mt-8 flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-cream/60 text-sm">{t("authLayout.statReferences")}</div>
              </div>
              <div className="w-px h-12 bg-gold/30" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">24h</div>
                <div className="text-cream/60 text-sm">{t("authLayout.statDelivery")}</div>
              </div>
              <div className="w-px h-12 bg-gold/30" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-cream/60 text-sm">{t("authLayout.statAuthentic")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
