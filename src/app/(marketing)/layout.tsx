import Footer from "@/components/landing/Footer";
import SiteHeader from "@/components/landing/SiteHeader";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="flex-1">
          {children}
      </div>
      <Footer />
    </div>
  );
}