import { useState } from "react";
import { C } from "./shared/constants/constants";
import { useCompanyMaster } from "./modules/company-master/hooks/useCompanyMaster";

import { TopBar } from "./shared/components/TopBar";
import { Header } from "./shared/components/Header";
import { NavBar } from "./shared/components/NavBar";
import { Footer } from "./shared/components/Footer";

import { HomePage } from "./modules/public-website/pages/HomePage";
import { AboutPage } from "./modules/public-website/pages/AboutPage";
import { ProductsPage } from "./modules/public-website/pages/ProductsPage";
import { QualityPage } from "./modules/public-website/pages/QualityPage";
import { CareersPage } from "./modules/public-website/pages/CareersPage";
import { MediaPage } from "./modules/public-website/pages/MediaPage";
import { ContactPage } from "./modules/public-website/pages/ContactPage";
import { CompanyMasterFormPage } from "./modules/company-master/pages/CompanyMasterFormPage";
import { CompanyMasterListPage } from "./modules/company-master/pages/CompanyMasterListPage";
import { InventoryTransactionPage } from "./modules/inventory/pages/InventoryTransactionPage";

export default function App() {
  const [page, setPage] = useState("home");
  const cm = useCompanyMaster();

  const pages = {
    home: <HomePage setPage={setPage} />,
    about: <AboutPage />,
    products: <ProductsPage setPage={setPage} />,
    quality: <QualityPage />,
    careers: <CareersPage />,
    media: <MediaPage />,
    contact: <ContactPage />,
    "company-master-form": <CompanyMasterFormPage cm={cm} page={page} setPage={setPage} />,
    "company-master-list": <CompanyMasterListPage cm={cm} page={page} setPage={setPage} />,
    "inventory-transactions": <InventoryTransactionPage />,
  };

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.bg }}>
      <TopBar />
      <Header page={page} setPage={setPage} />
      <NavBar page={page} setPage={setPage} />
      {pages[page] || pages.home}
      <Footer setPage={setPage} />
    </div>
  );
}
