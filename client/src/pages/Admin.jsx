import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
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

// The admin page (/admin). Only admins may see it.
// (This only hides the page. The real protection is on the server, which
// refuses every /api/admin request that does not come from an admin.)
function Admin() {
  const { user, loading } = useContext(AuthContext);
  const [active, setActive] = useState("customers");

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: "/admin" }} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

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
