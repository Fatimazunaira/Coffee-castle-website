import { useState } from "react";
import PromoEditor from "../components/admin/PromoEditor";
import CustomersPanel from "../components/admin/CustomersPanel";
import TablesPanel from "../components/admin/TablesPanel";
import MenuPanel from "../components/admin/MenuPanel";

// The tabs of the admin panel
const tabs = [
  { id: "customers", label: "CUSTOMERS", panel: <CustomersPanel /> },
  { id: "tables", label: "TABLES", panel: <TablesPanel /> },
  { id: "menu", label: "MENU", panel: <MenuPanel /> },
  { id: "promo", label: "PROMO BANNER", panel: <PromoEditor /> },
];

function Admin() {
  const [active, setActive] = useState("customers");
  const current = tabs.find((tab) => tab.id === active);

  return (
    <section className="admin-page">
      <div className="page-heading">
        <span className="page-script">Café</span>
        <h1>Admin</h1>
      </div>

      <div className="tab-row" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            className={tab.id === active ? "tab-btn active" : "tab-btn"}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* key makes the panel load fresh data every time you switch tabs */}
      <div key={current.id}>{current.panel}</div>
    </section>
  );
}

export default Admin;
