import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  LayoutDashboard,
  Coffee,
  Receipt,
  TrendingUp,
  Settings,
  History,
  LogOut,
  Plus,
  Trash,
  Edit,
  AlertCircle,
  Users,
  Search,
  CheckSquare,
  DollarSign
} from "lucide-react";

// Dynamic API Base Detection
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : window.location.origin;

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [adminUser, setAdminUser] = useState<any>(JSON.parse(localStorage.getItem("admin_user") || "null"));
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // API Request helper with auth token attachment
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Content-Type", "application/json");
    
    let res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    
    // Check if token is expired, attempt token refresh
    if (res.status === 403) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, { method: "POST" });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setToken(data.accessToken);
          localStorage.setItem("admin_token", data.accessToken);
          
          // Retry original request with new token
          headers.set("Authorization", `Bearer ${data.accessToken}`);
          res = await fetch(`${API_BASE}${url}`, { ...options, headers });
        } else {
          // Refresh failed, logout
          handleLogout();
        }
      } catch (err) {
        handleLogout();
      }
    }
    return res;
  };

  const handleLoginSuccess = (accessToken: string, user: any) => {
    setToken(accessToken);
    setAdminUser(user);
    localStorage.setItem("admin_token", accessToken);
    localStorage.setItem("admin_user", JSON.stringify(user));
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: "POST" });
    } catch (e) {}
    setToken(null);
    setAdminUser(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  };

  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">☕</span>
          <h1 className="sidebar-title">Hotel Grand</h1>
        </div>
        
        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          <div className={`nav-item ${activeTab === "menu" ? "active" : ""}`} onClick={() => setActiveTab("menu")}>
            <Coffee size={20} />
            <span>Menu Manager</span>
          </div>
          <div className={`nav-item ${activeTab === "invoices" ? "active" : ""}`} onClick={() => setActiveTab("invoices")}>
            <Receipt size={20} />
            <span>Invoices Log</span>
          </div>
          <div className={`nav-item ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>
            <TrendingUp size={20} />
            <span>Analytics</span>
          </div>
          <div className={`nav-item ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
            <Settings size={20} />
            <span>Settings</span>
          </div>
          <div className={`nav-item ${activeTab === "audit" ? "active" : ""}`} onClick={() => setActiveTab("audit")}>
            <History size={20} />
            <span>Audit Logs</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={handleLogout} style={{ marginTop: 0 }}>
            <LogOut size={20} />
            <span>Logout ({adminUser?.username})</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <MainHeader activeTab={activeTab} adminUser={adminUser} handleLogout={handleLogout} />
        <main className="content-body">
          {activeTab === "dashboard" && <DashboardView fetchWithAuth={fetchWithAuth} />}
          {activeTab === "menu" && <MenuView fetchWithAuth={fetchWithAuth} />}
          {activeTab === "invoices" && <InvoicesView fetchWithAuth={fetchWithAuth} />}
          {activeTab === "analytics" && <AnalyticsView fetchWithAuth={fetchWithAuth} />}
          {activeTab === "settings" && <SettingsView fetchWithAuth={fetchWithAuth} />}
          {activeTab === "audit" && <AuditLogsView fetchWithAuth={fetchWithAuth} />}
        </main>
      </div>
    </div>
  );
}

/* ==========================================
   SUB-COMPONENTS & VIEWS
   ========================================== */

function MainHeader({ activeTab, adminUser }: { activeTab: string; adminUser: any; handleLogout: () => void }) {
  const [socketStatus, setSocketStatus] = useState<"connected" | "disconnected">("disconnected");
  
  useEffect(() => {
    const socket = io(API_BASE);
    socket.on("connect", () => setSocketStatus("connected"));
    socket.on("disconnect", () => setSocketStatus("disconnected"));
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <header className="header">
      <h2 className="page-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
      <div className="header-meta">
        <div className={`live-indicator ${socketStatus === "disconnected" ? "disconnected" : ""}`}>
          <div className="live-dot" />
          <span>{socketStatus === "connected" ? "Live Connected" : "Connecting..."}</span>
        </div>
        <div className="admin-profile">
          <div className="admin-avatar">
            {adminUser?.username?.substring(0, 2).toUpperCase()}
          </div>
          <span style={{ fontWeight: 600 }}>{adminUser?.username}</span>
        </div>
      </div>
    </header>
  );
}

// 1. LOGIN SCREEN
function LoginView({ onLoginSuccess }: { onLoginSuccess: (token: string, user: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      onLoginSuccess(data.accessToken, data.admin);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🍔</div>
          <h2 className="login-title">Admin Dashboard</h2>
          <p className="login-subtitle">Sign in to manage Hotel Grand</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. DASHBOARD VIEW (Live occupancies)
function DashboardView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [pulse, setPulse] = useState({ activeOrders: 0, paidBills: 0, todaySales: 0, averageTicket: 0 });
  const [tables, setTables] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const loadData = async () => {
    try {
      const pulseRes = await fetchWithAuth("/api/admin/reports/sales-pulse");
      if (pulseRes.ok) setPulse(await pulseRes.json());

      const tablesRes = await fetchWithAuth("/api/tables");
      if (tablesRes.ok) setTables(await tablesRes.json());
    } catch (err) {}
  };

  useEffect(() => {
    loadData();

    socketRef.current = io(API_BASE);
    socketRef.current.on("table-update", () => loadData());
    socketRef.current.on("order-update", () => loadData());
    socketRef.current.on("sales-update", () => loadData());

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <div>
      {/* Live Sales Pulse */}
      <div className="stats-grid">
        <div className="card stat-card primary">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div>
            <div className="stat-title">Today Sales</div>
            <div className="stat-value">₹{pulse.todaySales.toLocaleString("en-IN")}</div>
          </div>
        </div>
        <div className="card stat-card blue">
          <div className="stat-icon"><Users size={24} /></div>
          <div>
            <div className="stat-title">Active Tables</div>
            <div className="stat-value">{tables.filter(t => t.status !== "empty").length} / {tables.length}</div>
          </div>
        </div>
        <div className="card stat-card green">
          <div className="stat-icon"><CheckSquare size={24} /></div>
          <div>
            <div className="stat-title">Paid Bills</div>
            <div className="stat-value">{pulse.paidBills}</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon"><TrendingUp size={24} /></div>
          <div>
            <div className="stat-title">Avg Ticket</div>
            <div className="stat-value">₹{Math.round(pulse.averageTicket).toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      {/* Live Room Occupancy */}
      <div className="section-header">
        <h3 className="section-title">Dining Room Occupancy Grid</h3>
      </div>
      
      <div className="room-grid">
        {tables.map((table) => (
          <div key={table.id} className={`card table-card ${table.status.toLowerCase()}`}>
            <div className="table-header">
              <span className="table-name">{table.name}</span>
              <span className="table-status-pill">{table.status}</span>
            </div>
            <span className="table-seats">{table.seats} seats</span>
            {table.status !== "empty" && table.currentOrderId && (
              <div className="table-order-info">
                <span className="table-order-no">Live Occupied</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. MENU MANAGER
function MenuView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  
  // Modals status
  const [itemModal, setItemModal] = useState<boolean>(false);
  const [catModal, setCatModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editCat, setEditCat] = useState<any | null>(null);

  // Form states
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemEmoji, setItemEmoji] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemVeg, setItemVeg] = useState(true);
  const [itemAvailable, setItemAvailable] = useState(true);

  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");
  const [catSort, setCatSort] = useState(0);

  const loadData = async () => {
    try {
      const catRes = await fetchWithAuth("/api/categories");
      if (catRes.ok) {
        const cats = await catRes.json();
        setCategories(cats);
        if (cats.length > 0) setItemCategoryId(cats[0].id);
      }
      const menuRes = await fetchWithAuth("/api/menu");
      if (menuRes.ok) setMenuItems(await menuRes.json());
    } catch (e) {}
  };

  useEffect(() => { loadData(); }, []);

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: itemName,
      price: parseFloat(itemPrice),
      emoji: itemEmoji || null,
      categoryId: itemCategoryId,
      isVeg: itemVeg,
      isAvailable: itemAvailable,
    };

    try {
      const url = editItem ? `/api/admin/menu/${editItem.id}` : "/api/admin/menu";
      const method = editItem ? "PUT" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        loadData();
        setItemModal(false);
        setEditItem(null);
      }
    } catch (e) {}
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: catName,
      icon: catIcon,
      sortOrder: Number(catSort),
    };

    try {
      const url = editCat ? `/api/admin/categories/${editCat.id}` : "/api/admin/categories";
      const method = editCat ? "PUT" : "POST";
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        loadData();
        setCatModal(false);
        setEditCat(null);
      }
    } catch (e) {}
  };

  const openAddItem = () => {
    setItemName("");
    setItemPrice("");
    setItemEmoji("");
    if (categories.length > 0) setItemCategoryId(categories[0].id);
    setItemVeg(true);
    setItemAvailable(true);
    setEditItem(null);
    setItemModal(true);
  };

  const openEditItem = (item: any) => {
    setEditItem(item);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setItemEmoji(item.emoji || "");
    setItemCategoryId(item.categoryId);
    setItemVeg(item.isVeg);
    setItemAvailable(item.isAvailable);
    setItemModal(true);
  };

  const openAddCat = () => {
    setCatName("");
    setCatIcon("");
    setCatSort(categories.length);
    setEditCat(null);
    setCatModal(true);
  };

  const openEditCat = (cat: any) => {
    setEditCat(cat);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatSort(cat.sortOrder);
    setCatModal(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to soft delete this menu item?")) return;
    try {
      const res = await fetchWithAuth(`/api/admin/menu/${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (e) {}
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Deleting a category will soft delete all its menu items too. Proceed?")) return;
    try {
      const res = await fetchWithAuth(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (e) {}
  };

  return (
    <div>
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === "items" ? "active" : ""}`} onClick={() => setActiveTab("items")}>
          Menu Items
        </button>
        <button className={`tab-btn ${activeTab === "categories" ? "active" : ""}`} onClick={() => setActiveTab("categories")}>
          Categories
        </button>
      </div>

      {activeTab === "items" ? (
        <div className="card">
          <div className="section-header" style={{ marginBottom: "20px" }}>
            <h4>Menu Items Catalog</h4>
            <button className="btn btn-primary" onClick={openAddItem}>
              <Plus size={16} /> Add Item
            </button>
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Emoji</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Veg/Non-Veg</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.id}>
                    <td><span style={{ fontSize: "20px" }}>{item.emoji || "🍽"}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{categories.find(c => c.id === item.categoryId)?.name || "Unknown"}</td>
                    <td>₹{Number(item.price).toFixed(2)}</td>
                    <td>
                      <span className={`table-status-pill ${item.isVeg ? "paid" : "active"}`}>
                        {item.isVeg ? "VEG" : "NON-VEG"}
                      </span>
                    </td>
                    <td>
                      <span className={`table-status-pill ${item.isAvailable ? "paid" : "empty"}`}>
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btn-secondary" style={{ padding: "8px 12px" }} onClick={() => openEditItem(item)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: "8px 12px" }} onClick={() => handleDeleteItem(item.id)}>
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="section-header" style={{ marginBottom: "20px" }}>
            <h4>Menu Categories</h4>
            <button className="btn btn-primary" onClick={openAddCat}>
              <Plus size={16} /> Add Category
            </button>
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Name</th>
                  <th>Sort Order</th>
                  <th>Items Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td><span style={{ fontSize: "20px" }}>{cat.icon}</span></td>
                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                    <td>{cat.sortOrder}</td>
                    <td>{menuItems.filter(item => item.categoryId === cat.id).length}</td>
                    <td>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button className="btn btn-secondary" style={{ padding: "8px 12px" }} onClick={() => openEditCat(cat)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: "8px 12px" }} onClick={() => handleDeleteCat(cat.id)}>
                          <Trash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editItem ? "Edit Menu Item" : "Add Menu Item"}</h3>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setItemModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Price (₹)</label>
                  <input type="number" step="0.01" className="form-input" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} required />
                </div>
                <div style={{ width: "100px" }}>
                  <label className="form-label">Emoji</label>
                  <input type="text" className="form-input" value={itemEmoji} onChange={(e) => setItemEmoji(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={itemCategoryId} onChange={(e) => setItemCategoryId(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ display: "flex", gap: "40px", marginTop: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="checkbox" checked={itemVeg} onChange={(e) => setItemVeg(e.target.checked)} />
                  <span>Is Vegetarian</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="checkbox" checked={itemAvailable} onChange={(e) => setItemAvailable(e.target.checked)} />
                  <span>Is Available</span>
                </label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "20px" }}>
                Save Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editCat ? "Edit Category" : "Add Category"}</h3>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setCatModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input type="text" className="form-input" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Icon / Emoji</label>
                  <input type="text" className="form-input" value={catIcon} onChange={(e) => setCatIcon(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Sort Order</label>
                  <input type="number" className="form-input" value={catSort} onChange={(e) => setCatSort(Number(e.target.value))} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "20px" }}>
                Save Category
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. INVOICES HISTORY VIEW
function InvoicesView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // States for Create Invoice modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [unpaidOrders, setUnpaidOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/invoices");
      if (res.ok) setInvoices(await res.json());
    } catch (e) {}
  };

  const loadUnpaidOrders = async () => {
    try {
      const res = await fetchWithAuth("/api/orders");
      if (res.ok) {
        const allOrders = await res.json();
        const unpaid = allOrders.filter((o: any) => o.status !== "paid");
        setUnpaidOrders(unpaid);
        if (unpaid.length > 0) {
          setSelectedOrderId(unpaid[0].id);
        } else {
          setSelectedOrderId("");
        }
      }
    } catch (err) {
      console.error("Failed to load unpaid orders:", err);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (showCreateModal) {
      loadUnpaidOrders();
      setError("");
    }
  }, [showCreateModal]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      setError("Please select an active order.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetchWithAuth(`/api/orders/${selectedOrderId}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        loadData();
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create invoice.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.orderNo.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoiceNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <div className="section-header" style={{ marginBottom: "20px" }}>
        <h4>Billing Invoice Records</h4>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create Invoice
          </button>
          <div style={{ display: "flex", alignItems: "center", backgroundColor: "var(--bg-panel-light)", padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", width: "300px" }}>
            <Search size={16} style={{ color: "var(--text-muted)", marginRight: "10px" }} />
            <input
              type="text"
              placeholder="Search Order No / Invoice..."
              style={{ background: "none", border: "none", outline: "none", width: "100%", color: "var(--text-main)" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Order Number</th>
              <th>Table</th>
              <th>Total Amount</th>
              <th>Payment Method</th>
              <th>Checkout Date</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id}>
                <td style={{ fontWeight: 700, color: "var(--color-primary-light)" }}>{inv.invoiceNo}</td>
                <td>{inv.orderNo}</td>
                <td>T{inv.tableId}</td>
                <td style={{ fontWeight: 700 }}>₹{Number(inv.total).toFixed(2)}</td>
                <td>
                  <span className="table-status-pill bill">{inv.paymentMethod.toUpperCase()}</span>
                </td>
                <td>{new Date(inv.createdAt).toLocaleString("en-IN")}</td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => setSelectedInvoice(inv)}>
                    View Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>Thermal Receipt</h3>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>
            
            {/* Receipt style */}
            <div style={{ backgroundColor: "#fff", color: "#000", fontFamily: "monospace", padding: "24px", borderRadius: "8px", boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)" }}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <h4 style={{ fontWeight: 800, fontSize: "18px" }}>HOTEL GRAND</h4>
                <p style={{ fontSize: "12px", color: "#666" }}>123 Grand Street, City Center</p>
                <p style={{ fontSize: "12px", color: "#666" }}>GST: 27AAAAA1111A1Z1</p>
                <p style={{ margin: "10px 0", borderBottom: "1px dashed #000" }} />
              </div>
              <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div><strong>Invoice No:</strong> {selectedInvoice.invoiceNo}</div>
                <div><strong>Order No:</strong> {selectedInvoice.orderNo}</div>
                <div><strong>Table:</strong> T{selectedInvoice.tableId}</div>
                <div><strong>Date:</strong> {new Date(selectedInvoice.createdAt).toLocaleString("en-IN")}</div>
                <div><strong>Paid via:</strong> {selectedInvoice.paymentMethod.toUpperCase()}</div>
              </div>
              
              <p style={{ margin: "12px 0", borderBottom: "1px dashed #000" }} />
              
              <table style={{ width: "100%", fontSize: "13px", textAlign: "left" }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: "right" }}>{item.qty}</td>
                      <td style={{ textAlign: "right" }}>₹{(Number(item.price) * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <p style={{ margin: "12px 0", borderBottom: "1px dashed #000" }} />
 
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", alignItems: "flex-end" }}>
                <div>Subtotal: ₹{Number(selectedInvoice.subtotal).toFixed(2)}</div>
                <div>GST (5%): ₹{Number(selectedInvoice.gstAmount).toFixed(2)}</div>
                <div style={{ fontSize: "15px", fontWeight: "bold", marginTop: "4px" }}>Total: ₹{Number(selectedInvoice.total).toFixed(2)}</div>
              </div>
 
              <div style={{ textAlign: "center", marginTop: "24px", fontSize: "11px", color: "#666" }}>
                Thank You! Visit Again.
              </div>
            </div>
 
            <button className="btn btn-primary" style={{ width: "100%", marginTop: "20px" }} onClick={() => window.print()}>
              Print Receipt
            </button>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h3>Create Invoice</h3>
              <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateInvoice}>
              <div className="form-group">
                <label className="form-label">Select Active Order</label>
                {unpaidOrders.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", padding: "10px 0" }}>No active/unpaid orders found.</div>
                ) : (
                  <select 
                    className="form-input" 
                    value={selectedOrderId} 
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    required
                  >
                    {unpaidOrders.map((order) => {
                      const itemsPreview = order.items?.map((it: any) => `${it.qty}x ${it.name}`).join(", ");
                      return (
                        <option key={order.id} value={order.id}>
                          Order {order.orderNo} (T{order.tableId}) - ₹{Number(order.total).toFixed(2)} {itemsPreview ? `[${itemsPreview}]` : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className="form-group" style={{ marginTop: "16px" }}>
                <label className="form-label">Payment Method</label>
                <select 
                  className="form-input" 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                >
                  <option value="cash">CASH</option>
                  <option value="upi">UPI</option>
                  <option value="card">CARD</option>
                  <option value="credit">CREDIT</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%", marginTop: "24px" }} 
                disabled={submitting || unpaidOrders.length === 0}
              >
                {submitting ? "Generating Invoice..." : "Generate Invoice & Close Order"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. ANALYTICS VIEW
function AnalyticsView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [trends, setTrends] = useState<any>({ weekly: [], monthly: [] });
  const [dailyClose, setDailyClose] = useState<any>({ sales: 0, breakdown: { cash: 0, upi: 0, card: 0, credit: 0 }, orderCount: 0 });

  const loadData = async () => {
    try {
      const trendsRes = await fetchWithAuth("/api/admin/reports/sales-trends");
      if (trendsRes.ok) setTrends(await trendsRes.json());

      const closeRes = await fetchWithAuth("/api/admin/reports/daily-close");
      if (closeRes.ok) setDailyClose(await closeRes.json());
    } catch (e) {}
  };

  useEffect(() => { loadData(); }, []);

  const maxWeekly = Math.max(...trends.weekly.map((d: any) => d.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
      {/* Daily close report */}
      <div className="card">
        <h4 style={{ marginBottom: "20px" }}>Today's Financial Summary (Daily Close)</h4>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "30px" }}>
          <div style={{ backgroundColor: "var(--bg-panel-light)", padding: "20px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "bold" }}>TOTAL DAILY SALES</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-green-light)", marginTop: "4px" }}>₹{dailyClose.sales.toLocaleString("en-IN")}</div>
          </div>
          <div style={{ backgroundColor: "var(--bg-panel-light)", padding: "20px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "bold" }}>ORDERS PROCESSED</div>
            <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-blue-light)", marginTop: "4px" }}>{dailyClose.orderCount} orders</div>
          </div>
          <div style={{ backgroundColor: "var(--bg-panel-light)", padding: "20px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "bold" }}>AVERAGE TICKET</div>
            <div style={{ fontSize: "28px", fontWeight: "800", marginTop: "4px" }}>
              ₹{dailyClose.orderCount > 0 ? Math.round(dailyClose.sales / dailyClose.orderCount).toLocaleString("en-IN") : 0}
            </div>
          </div>
        </div>

        <h5 style={{ color: "var(--text-muted)", marginBottom: "16px", textTransform: "uppercase", fontSize: "13px", letterSpacing: "0.5px" }}>Payment Methods Breakdown</h5>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {Object.entries(dailyClose.breakdown).map(([method, amount]: [string, any]) => (
            <div key={method} style={{ padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ textTransform: "uppercase", fontWeight: 700, fontSize: "13px" }}>{method}</span>
              <span style={{ fontWeight: 800 }}>₹{amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graphical charts */}
      <div className="card">
        <h4>Weekly Revenue Trend</h4>
        
        <div className="chart-container">
          {trends.weekly.map((day: any) => {
            const heightPct = `${(day.value / maxWeekly) * 80}%`;
            return (
              <div key={day.label} className="chart-bar-col">
                <span style={{ fontSize: "11px", fontWeight: "bold" }}>₹{Math.round(day.value)}</span>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ height: heightPct }} />
                </div>
                <span className="chart-label">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 6. SETTINGS VIEW
function SettingsView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [restaurantName, setRestaurantName] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [tableCount, setTableCount] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "danger"; message: string } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetchWithAuth("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setRestaurantName(data.restaurantName);
          setAddress(data.address);
          setGstNumber(data.gstNumber);
          setGstPercent(data.gstPercent.toString());
          setCurrency(data.currency);
          setTableCount(data.tableCount.toString());
        }
      } catch (e) {}
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    const payload = {
      restaurantName,
      address,
      gstNumber,
      gstPercent: parseFloat(gstPercent),
      currency,
      tableCount: parseInt(tableCount, 10),
    };

    try {
      const res = await fetchWithAuth("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAlert({ type: "success", message: "Restaurant configurations updated successfully!" });
      } else {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
    } catch (err: any) {
      setAlert({ type: "danger", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: "700px" }}>
      <h4 style={{ marginBottom: "24px" }}>Manage Restaurant Configuration</h4>

      {alert && (
        <div className={`alert alert-${alert.type}`}>
          <AlertCircle size={18} />
          <span>{alert.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Restaurant Name</label>
          <input type="text" className="form-input" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="form-input" style={{ minHeight: "80px", resize: "vertical" }} value={address} onChange={(e) => setAddress(e.target.value)} required />
        </div>
        <div className="form-group" style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">GSTIN / Tax Registration</label>
            <input type="text" className="form-input" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} required />
          </div>
          <div style={{ width: "150px" }}>
            <label className="form-label">Tax / GST (%)</label>
            <input type="number" step="0.1" className="form-input" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} required />
          </div>
        </div>
        <div className="form-group" style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Currency Symbol</label>
            <input type="text" className="form-input" value={currency} onChange={(e) => setCurrency(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Tables Count</label>
            <input type="number" className="form-input" value={tableCount} onChange={(e) => setTableCount(e.target.value)} required />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: "10px" }} disabled={loading}>
          {loading ? "Saving Settings..." : "Save Configuration"}
        </button>
      </form>
    </div>
  );
}

// 7. AUDIT LOGS VIEW
function AuditLogsView({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [logs, setLogs] = useState<any[]>([]);

  const loadLogs = async () => {
    try {
      const res = await fetchWithAuth("/api/admin/reports/audit-logs");
      if (res.ok) setLogs(await res.json());
    } catch (e) {}
  };

  useEffect(() => { loadLogs(); }, []);

  return (
    <div className="card">
      <h4 style={{ marginBottom: "20px" }}>Administrative Activity History</h4>

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Admin Profile</th>
              <th>Action Category</th>
              <th>Target Model</th>
              <th>Target ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                <td style={{ fontWeight: 700 }}>{log.admin?.username || "SYSTEM / POS CLIENT"}</td>
                <td style={{ color: "var(--color-primary-light)" }}>{log.action}</td>
                <td><span className="table-status-pill empty">{log.entityType}</span></td>
                <td style={{ fontFamily: "monospace", fontSize: "13px" }}>{log.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
