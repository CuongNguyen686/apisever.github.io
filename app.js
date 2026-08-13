import ReactDOM from "https://esm.sh/react-dom@18.3.1/client";\nimport React, { useState, useEffect, useMemo } from "https://esm.sh/react@18.3.1";
import {
  LayoutDashboard, Package as PackageIcon, KeyRound, Info, FileText,
  Plus, Trash2, RotateCcw, Search, Copy, Check, X, Ban, Smartphone,
  ChevronDown, ChevronUp, LogOut, Download, Book, ShieldAlert, Eye, EyeOff,
  MessageSquare, Send, Settings2
} from "https://esm.sh/lucide-react@0.468.0?deps=react@18.3.1";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "https://esm.sh/recharts@2.13.3?deps=react@18.3.1";

// ---------- helpers ----------
const rand = (len = 6) =>
  Array.from({ length: len }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const genKey = () => `PK-${rand(4)}-${rand(4)}-${rand(4)}`;
const genToken = () => `tok_${rand(8)}${rand(8)}`.toLowerCase();
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtDate = (ts) => new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

const DURATIONS = [
  { key: "1d", label: "1 ngày", ms: 24 * 3600 * 1000 },
  { key: "3d", label: "3 ngày", ms: 3 * 24 * 3600 * 1000 },
  { key: "7d", label: "7 ngày", ms: 7 * 24 * 3600 * 1000 },
  { key: "1th", label: "1 tháng", ms: 30 * 24 * 3600 * 1000 },
  { key: "3th", label: "3 tháng", ms: 90 * 24 * 3600 * 1000 },
  { key: "1nam", label: "1 năm", ms: 365 * 24 * 3600 * 1000 },
];

function timeLeft(expiresAt) {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return { label: "Hết hạn", expired: true };
  const days = Math.floor(diff / (24 * 3600 * 1000));
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  if (days > 0) return { label: `còn ${days} ngày`, expired: false };
  return { label: `còn ${hours} giờ`, expired: false };
}

// ---------- storage ----------
async function loadState() {
  try {
    const raw = localStorage.getItem("key-server-app-data");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function saveState(data) {
  try {
    localStorage.setItem("key-server-app-data", JSON.stringify(data));
  } catch {
    /* best effort */
  }
}

// ---------- small UI atoms ----------
function Badge({ tone = "pink", children }) {
  const tones = {
    pink: "bg-pink-100 text-pink-700 border-pink-200",
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    gray: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tones[tone]}`}>
      {children}
    </span>
  );
}

function CopyField({ value, mono = true }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 text-xs transition ${mono ? "font-mono" : ""}`}
      title="Sao chép"
    >
      {value}
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <span
        onClick={() => onChange(!checked)}
        className={`w-10 h-5.5 h-6 rounded-full relative transition shrink-0 ${checked ? "bg-pink-500" : "bg-gray-200"}`}
        style={{ width: 40, height: 22 }}
      >
        <span
          className="absolute top-0.5 bg-white rounded-full shadow transition-all"
          style={{ width: 18, height: 18, left: checked ? 20 : 2, top: 2 }}
        />
      </span>
    </label>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
const inputCls =
  "w-full px-3 py-2 rounded-lg border border-pink-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent placeholder:text-gray-400";

function Toast({ msg, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
      {msg}
    </div>
  );
}

function Confirm({ title, desc, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-pink-100">
        <div className="flex items-center gap-2 text-rose-600 mb-2">
          <ShieldAlert size={18} />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">{desc}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Huỷ</button>
          <button onClick={onConfirm} className="px-3 py-1.5 rounded-lg text-sm bg-rose-500 text-white hover:bg-rose-600">Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

// ---------- Login ----------
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-pink-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-200">
            <KeyRound size={26} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Key Server Console</h1>
          <p className="text-sm text-gray-400 mt-1">Quản lý package &amp; key phát triển</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!user.trim() || !pass.trim()) {
              setErr("Vui lòng nhập tài khoản và mật khẩu");
              return;
            }
            onLogin(user.trim());
          }}
          className="bg-white border border-pink-100 rounded-2xl p-6 shadow-xl shadow-pink-100/50"
        >
          <Field label="Tài khoản">
            <input className={inputCls} value={user} onChange={(e) => setUser(e.target.value)} placeholder="admin" />
          </Field>
          <Field label="Mật khẩu">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                className={inputCls + " pr-9"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2.5 top-2.5 text-gray-400">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          {err && <p className="text-xs text-rose-500 mb-2">{err}</p>}
          <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-medium py-2.5 rounded-lg transition shadow-md shadow-pink-200">
            Đăng nhập
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">Nhập bất kỳ tài khoản để vào bảng điều khiển demo</p>
        </form>
      </div>
    </div>
  );
}

// ---------- Main App ----------
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [packages, setPackages] = useState([]);
  const [keys, setKeys] = useState([]);
  const [bannedDevices, setBannedDevices] = useState([]);
  const [toast, setToast] = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await loadState();
      if (data) {
        setPackages(data.packages || []);
        setKeys(data.keys || []);
        setBannedDevices(data.bannedDevices || []);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveState({ packages, keys, bannedDevices });
  }, [packages, keys, bannedDevices, loaded]);

  const notify = (msg) => setToast(msg);

  if (!loggedIn) return <Login onLogin={(u) => { setUserName(u); setLoggedIn(true); }} />;

  const activePackage = packages[0] || null;

  const nav = [
    { id: "dashboard", label: "Trang chủ", icon: LayoutDashboard },
    { id: "packages", label: "Quản lý Package", icon: PackageIcon },
    { id: "keys", label: "Quản lý Key", icon: KeyRound },
    { id: "usage", label: "Gói đang sử dụng", icon: Info },
    { id: "docs", label: "Tài liệu & Tích hợp", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-pink-50/40 flex text-gray-800">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-pink-100 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-pink-100">
          <div className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center">
            <KeyRound size={16} />
          </div>
          <span className="font-bold text-gray-800 text-sm">Key Server</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active ? "bg-pink-500 text-white shadow-md shadow-pink-200" : "text-gray-500 hover:bg-pink-50 hover:text-pink-600"
                }`}
              >
                <Icon size={16} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-pink-100">
          <button
            onClick={() => setLoggedIn(false)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-6 md:p-8">
        {tab === "dashboard" && (
          <Dashboard packages={packages} keys={keys} setKeys={setKeys} bannedDevices={bannedDevices} setBannedDevices={setBannedDevices} notify={notify} />
        )}
        {tab === "packages" && (
          <Packages
            packages={packages}
            setPackages={setPackages}
            keys={keys}
            setKeys={setKeys}
            notify={notify}
            confirmModal={confirmModal}
            setConfirmModal={setConfirmModal}
            goHome={() => setTab("dashboard")}
          />
        )}
        {tab === "keys" && (
          <Keys packages={packages} keys={keys} setKeys={setKeys} notify={notify} confirmModal={confirmModal} setConfirmModal={setConfirmModal} />
        )}
        {tab === "usage" && <UsageInfo activePackage={activePackage} keys={keys} />}
        {tab === "docs" && <Docs activePackage={activePackage} />}
      </main>

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      {confirmModal && (
        <Confirm
          title={confirmModal.title}
          desc={confirmModal.desc}
          onCancel={() => setConfirmModal(null)}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
        />
      )}
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ packages, keys, setKeys, bannedDevices, setBannedDevices, notify }) {
  const [deviceInput, setDeviceInput] = useState("");
  const chartData = packages.map((p) => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + "…" : p.name,
    "Đã sử dụng": keys.filter((k) => k.packageId === p.id).reduce((s, k) => s + k.usedCount, 0),
    "Còn lại": keys.filter((k) => k.packageId === p.id).reduce((s, k) => s + Math.max(k.maxUses - k.usedCount, 0), 0),
  }));
  const bannedKeys = keys.filter((k) => k.banned);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Trang chủ</h1>
      <p className="text-sm text-gray-400 mb-6">Tổng quan sử dụng key và danh sách cấm</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Package" value={packages.length} icon={PackageIcon} />
        <StatCard label="Tổng key" value={keys.length} icon={KeyRound} />
        <StatCard label="Key bị ban" value={bannedKeys.length} icon={Ban} tone="rose" />
        <StatCard label="Thiết bị bị ban" value={bannedDevices.length} icon={Smartphone} tone="rose" />
      </div>

      <div className="bg-white border border-pink-100 rounded-2xl p-5 mb-6 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Sơ đồ lượt key đã sử dụng theo package</h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Chưa có package nào để hiển thị.</p>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, borderColor: "#fbcfe8", fontSize: 12 }} />
                <Bar dataKey="Đã sử dụng" fill="#ec4899" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Còn lại" fill="#fbcfe8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
            <Ban size={15} className="text-rose-500" /> Key đã ban
          </h3>
          {bannedKeys.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có key nào bị ban.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {bannedKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between text-sm border border-rose-100 bg-rose-50/50 rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-rose-700">{k.value}</span>
                  <button
                    onClick={() => {
                      setKeys((ks) => ks.map((x) => (x.id === k.id ? { ...x, banned: false } : x)));
                      notify("Đã bỏ ban key");
                    }}
                    className="text-xs text-pink-600 hover:underline"
                  >
                    Bỏ ban
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm flex items-center gap-2">
            <Smartphone size={15} className="text-rose-500" /> Ban UID / thiết bị
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              value={deviceInput}
              onChange={(e) => setDeviceInput(e.target.value)}
              placeholder="Nhập UID thiết bị..."
              className={inputCls}
            />
            <button
              onClick={() => {
                if (!deviceInput.trim()) return;
                if (bannedDevices.includes(deviceInput.trim())) {
                  notify("UID này đã bị ban");
                  return;
                }
                setBannedDevices((d) => [...d, deviceInput.trim()]);
                setDeviceInput("");
                notify("Đã ban thiết bị");
              }}
              className="px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm shrink-0"
            >
              Ban
            </button>
          </div>
          {bannedDevices.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có thiết bị nào bị ban.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-auto">
              {bannedDevices.map((d) => (
                <div key={d} className="flex items-center justify-between text-sm border border-rose-100 bg-rose-50/50 rounded-lg px-3 py-2">
                  <span className="font-mono text-xs text-rose-700">{d}</span>
                  <button
                    onClick={() => setBannedDevices((list) => list.filter((x) => x !== d))}
                    className="text-xs text-pink-600 hover:underline"
                  >
                    Bỏ ban
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "pink" }) {
  const tones = { pink: "text-pink-500 bg-pink-50", rose: "text-rose-500 bg-rose-50" };
  return (
    <div className="bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${tones[tone]}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// ---------- Packages ----------
const emptyForm = {
  name: "", description: "", keyName: "", version: "1.0.0",
  status: "active", allowFreeLogin: false, getRealUidIOS: false,
  contactLink: "", updateLink: "", notifyMessage: "",
};

function Packages({ packages, setPackages, keys, setKeys, notify, setConfirmModal, goHome }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      keyName: p.keyName,
      version: p.version,
      status: p.status,
      allowFreeLogin: p.allowFreeLogin,
      getRealUidIOS: p.getRealUidIOS,
      contactLink: p.contactLink,
      updateLink: p.updateLink,
      notifyMessage: p.notifyMessage,
    });
    setShowForm(true);
  };

  const submitForm = () => {
    if (!form.name.trim()) {
      notify("Vui lòng nhập tên package");
      return;
    }
    if (editingId) {
      setPackages((ps) => ps.map((p) => (p.id === editingId ? { ...p, ...form } : p)));
      notify("Đã lưu tuỳ chỉnh package");
      closeForm();
      goHome();
    } else {
      const pkg = {
        id: uid(),
        ...form,
        apiKey: genKey(),
        token: genToken(),
        createdAt: Date.now(),
      };
      setPackages((p) => [pkg, ...p]);
      notify("Đã tạo package");
      closeForm();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Package</h1>
          <p className="text-sm text-gray-400">Tạo và cấu hình các package dev cho ứng dụng của bạn</p>
        </div>
        <button
          onClick={() => (showForm ? closeForm() : startCreate())}
          className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-md shadow-pink-200"
        >
          <Plus size={16} /> Tạo package
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-pink-100 rounded-2xl p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-700 text-sm mb-4">
            {editingId ? "Tuỳ chỉnh thông tin package" : "Tạo package mới"}
          </h3>
          <div className="grid md:grid-cols-2 gap-x-6">
            <Field label="Tên package">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: App Pro Package" />
            </Field>
            <Field label="Tên key">
              <input className={inputCls} value={form.keyName} onChange={(e) => setForm({ ...form, keyName: e.target.value })} placeholder="VD: PRO-KEY" />
            </Field>
            <Field label="Mô tả">
              <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả package..." />
            </Field>
            <Field label="Version">
              <input className={inputCls} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0.0" />
            </Field>
            <Field label="Trạng thái hoạt động">
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Đang hoạt động</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </Field>
            <Field label="Link liên hệ">
              <input className={inputCls} value={form.contactLink} onChange={(e) => setForm({ ...form, contactLink: e.target.value })} placeholder="https://t.me/..." />
            </Field>
            <Field label="Link cập nhật app">
              <input className={inputCls} value={form.updateLink} onChange={(e) => setForm({ ...form, updateLink: e.target.value })} placeholder="https://..." />
            </Field>
            <Field label="Thông báo đến người dùng key">
              <input className={inputCls} value={form.notifyMessage} onChange={(e) => setForm({ ...form, notifyMessage: e.target.value })} placeholder="VD: Bảo trì từ 0h-2h..." />
            </Field>
          </div>
          <div className="border-t border-pink-100 mt-2 pt-2">
            <Toggle checked={form.allowFreeLogin} onChange={(v) => setForm({ ...form, allowFreeLogin: v })} label="Cho phép đăng nhập key miễn phí" />
            <Toggle checked={form.getRealUidIOS} onChange={(v) => setForm({ ...form, getRealUidIOS: v })} label="Lấy UID thật từ iOS" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={closeForm} className="px-4 py-2 rounded-lg text-sm border border-gray-200 hover:bg-gray-50">Huỷ</button>
            <button onClick={submitForm} className="px-4 py-2 rounded-lg text-sm bg-pink-500 hover:bg-pink-600 text-white font-medium">
              {editingId ? "Hoàn thành" : "Tạo package"}
            </button>
          </div>
        </div>
      )}

      {packages.length === 0 ? (
        <EmptyState text="Chưa có package nào. Tạo package đầu tiên để bắt đầu." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {packages.map((p) => {
            const pkgKeys = keys.filter((k) => k.packageId === p.id);
            const uids = pkgKeys.filter((k) => k.uid).map((k) => ({ key: k.value, uid: k.uid }));
            const open = expanded === p.id;
            return (
              <div key={p.id} className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-semibold text-gray-800">{p.name}</h3>
                    <p className="text-xs text-gray-400">Tạo ngày {fmtDate(p.createdAt)}</p>
                  </div>
                  <Badge tone={p.status === "active" ? "green" : "amber"}>{p.status === "active" ? "Đang hoạt động" : "Bảo trì"}</Badge>
                </div>
                {p.description && <p className="text-sm text-gray-500 mb-3">{p.description}</p>}

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge tone="gray">v{p.version}</Badge>
                  <Badge tone="pink">{pkgKeys.length} key</Badge>
                  {p.allowFreeLogin && <Badge tone="gray">Free login</Badge>}
                  {p.getRealUidIOS && <Badge tone="gray">UID iOS thật</Badge>}
                </div>

                <div className="text-xs text-gray-500 mb-1">Token package</div>
                <div className="mb-3"><CopyField value={p.token} /></div>

                <button onClick={() => setExpanded(open ? null : p.id)} className="text-xs text-pink-600 flex items-center gap-1 mb-3">
                  UID đã nhập key ({uids.length}) {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {open && (
                  <div className="mb-3 space-y-1 max-h-32 overflow-auto">
                    {uids.length === 0 ? (
                      <p className="text-xs text-gray-400">Chưa có ai đăng nhập key.</p>
                    ) : (
                      uids.map((u, i) => (
                        <div key={i} className="flex justify-between text-xs bg-pink-50 rounded-md px-2 py-1">
                          <span className="font-mono">{u.key}</span>
                          <span className="font-mono text-gray-500">{u.uid}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-pink-50">
                  <button
                    onClick={() => startEdit(p)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50"
                  >
                    <Settings2 size={12} /> Tuỳ chỉnh
                  </button>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        title: "Reset tất cả key",
                        desc: `Đặt lại lượt dùng của toàn bộ key thuộc "${p.name}"?`,
                        onConfirm: () => {
                          setKeys((ks) => ks.map((k) => (k.packageId === p.id ? { ...k, usedCount: 0, uid: null, banned: false } : k)));
                          notify("Đã reset all key");
                        },
                      })
                    }
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-pink-200 text-pink-600 hover:bg-pink-50"
                  >
                    <RotateCcw size={12} /> Reset all key
                  </button>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        title: "Xoá tất cả key",
                        desc: `Xoá toàn bộ key thuộc "${p.name}"? Hành động không thể hoàn tác.`,
                        onConfirm: () => {
                          setKeys((ks) => ks.filter((k) => k.packageId !== p.id));
                          notify("Đã xoá all key của package");
                        },
                      })
                    }
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={12} /> Xoá all key
                  </button>
                  <button
                    onClick={() =>
                      setConfirmModal({
                        title: "Xoá package",
                        desc: `Xoá package "${p.name}" và toàn bộ key liên quan?`,
                        onConfirm: () => {
                          setPackages((ps) => ps.filter((x) => x.id !== p.id));
                          setKeys((ks) => ks.filter((k) => k.packageId !== p.id));
                          notify("Đã xoá package");
                        },
                      })
                    }
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 ml-auto"
                  >
                    <Trash2 size={12} /> Xoá package
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Keys ----------
function Keys({ packages, keys, setKeys, notify, setConfirmModal }) {
  const [pkgId, setPkgId] = useState("");
  const [duration, setDuration] = useState("7d");
  const [uses, setUses] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!pkgId && packages.length) setPkgId(packages[0].id);
  }, [packages]);

  const createKey = () => {
    if (!pkgId) {
      notify("Vui lòng chọn package");
      return;
    }
    const dur = DURATIONS.find((d) => d.key === duration);
    const k = {
      id: uid(),
      packageId: pkgId,
      name: `KEY-${rand(4)}`,
      value: genKey(),
      maxUses: Math.max(1, Number(uses) || 1),
      usedCount: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + dur.ms,
      uid: null,
      banned: false,
      note: "",
      messages: [],
    };
    setKeys((ks) => [k, ...ks]);
    notify("Đã tạo key");
  };

  const [detailId, setDetailId] = useState(null);
  const filtered = keys.filter((k) => k.name.toLowerCase().includes(search.toLowerCase()));
  const detailKey = keys.find((k) => k.id === detailId) || null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Key</h1>
          <p className="text-sm text-gray-400">Tạo nhanh và theo dõi các key đã phát hành</p>
        </div>
        <button
          onClick={() =>
            setConfirmModal({
              title: "Dọn key",
              desc: "Xoá toàn bộ key của tất cả package? Hành động không thể hoàn tác.",
              onConfirm: () => {
                setKeys([]);
                notify("Đã dọn toàn bộ key");
              },
            })
          }
          className="flex items-center gap-1.5 text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-xl"
        >
          <Trash2 size={15} /> Dọn key
        </button>
      </div>

      <div className="bg-white border border-pink-100 rounded-2xl p-5 mb-6 shadow-sm">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm">Tạo key nhanh</h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Field label="Chọn package">
            <select className={inputCls} value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
              {packages.length === 0 && <option value="">-- Chưa có package --</option>}
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Lượt nhập key tuỳ chỉnh">
            <input type="number" min={1} className={inputCls} value={uses} onChange={(e) => setUses(e.target.value)} />
          </Field>
          <Field label="&nbsp;">
            <button onClick={createKey} className="w-full bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5">
              <Plus size={15} /> Tạo key
            </button>
          </Field>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Thời hạn</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.key}
                onClick={() => setDuration(d.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  duration === d.key ? "bg-pink-500 border-pink-500 text-white" : "border-pink-200 text-pink-600 hover:bg-pink-50"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 text-sm">Danh sách key đã tạo ({filtered.length})</h3>
          <div className="relative w-56">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên key..." className={inputCls + " pl-8"} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState text="Không có key nào." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-pink-100">
                  <th className="py-2 pr-3 font-medium">Tên</th>
                  <th className="py-2 pr-3 font-medium">Key</th>
                  <th className="py-2 pr-3 font-medium">Package</th>
                  <th className="py-2 pr-3 font-medium">Lượt nhập</th>
                  <th className="py-2 pr-3 font-medium">Tạo ngày</th>
                  <th className="py-2 pr-3 font-medium">Thời hạn</th>
                  <th className="py-2 pr-3 font-medium">Trạng thái</th>
                  <th className="py-2 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((k) => {
                  const pkg = packages.find((p) => p.id === k.packageId);
                  const tl = timeLeft(k.expiresAt);
                  return (
                    <tr key={k.id} className="border-b border-pink-50 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-gray-700">
                        <div className="flex items-center gap-1.5">
                          {k.name}
                          {k.messages?.length > 0 && (
                            <span title={`${k.messages.length} tin nhắn đã gửi`} className="inline-flex items-center gap-0.5 text-[10px] text-pink-500">
                              <MessageSquare size={11} />{k.messages.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3"><CopyField value={k.value} /></td>
                      <td className="py-2.5 pr-3 text-gray-500">{pkg?.name || "—"}</td>
                      <td className="py-2.5 pr-3 text-gray-500">{k.usedCount}/{k.maxUses}</td>
                      <td className="py-2.5 pr-3 text-gray-500">{fmtDate(k.createdAt)}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={tl.expired ? "rose" : "gray"}>{tl.label}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        {k.banned ? <Badge tone="rose">Đã ban</Badge> : <Badge tone="green">Hoạt động</Badge>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setDetailId(k.id)}
                            className="text-xs px-2 py-1 rounded-md border border-pink-200 text-pink-600 hover:bg-pink-50 flex items-center gap-1"
                          >
                            <Settings2 size={11} /> Chi tiết
                          </button>
                          <button
                            onClick={() => {
                              const val = prompt("Nhập UID thiết bị để mô phỏng đăng nhập key:", k.uid || "");
                              if (val === null) return;
                              setKeys((ks) => ks.map((x) => (x.id === k.id ? { ...x, uid: val, usedCount: Math.min(x.maxUses, x.usedCount + 1) } : x)));
                            }}
                            className="text-xs px-2 py-1 rounded-md border border-pink-200 text-pink-600 hover:bg-pink-50"
                          >
                            Nhập UID
                          </button>
                          <button
                            onClick={() => setKeys((ks) => ks.map((x) => (x.id === k.id ? { ...x, banned: !x.banned } : x)))}
                            className="text-xs px-2 py-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                          >
                            <Ban size={11} /> {k.banned ? "Bỏ ban" : "Ban"}
                          </button>
                          <button
                            onClick={() => setKeys((ks) => ks.filter((x) => x.id !== k.id))}
                            className="text-xs px-2 py-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailKey && (
        <KeyDetailModal
          k={detailKey}
          pkg={packages.find((p) => p.id === detailKey.packageId)}
          onClose={() => setDetailId(null)}
          onSaveNote={(note) => {
            setKeys((ks) => ks.map((x) => (x.id === detailKey.id ? { ...x, note } : x)));
            notify("Đã lưu thông tin tuỳ chỉnh");
          }}
          onSendMessage={(text) => {
            setKeys((ks) =>
              ks.map((x) =>
                x.id === detailKey.id
                  ? { ...x, messages: [...(x.messages || []), { text, sentAt: Date.now() }] }
                  : x
              )
            );
            notify("Đã gửi tin nhắn đến người dùng key");
          }}
        />
      )}
    </div>
  );
}

// ---------- Key detail / per-key message modal ----------
function KeyDetailModal({ k, pkg, onClose, onSaveNote, onSendMessage }) {
  const [note, setNote] = useState(k.note || "");
  const [msg, setMsg] = useState("");
  const tl = timeLeft(k.expiresAt);

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-pink-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-pink-100">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              {k.name}
              {k.banned ? <Badge tone="rose">Đã ban</Badge> : <Badge tone={tl.expired ? "rose" : "green"}>{tl.expired ? "Hết hạn" : "Hoạt động"}</Badge>}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{pkg?.name || "—"} · {k.value}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <InfoRow label="UID đã nhập" value={k.uid || "Chưa có"} />
            <InfoRow label="Lượt dùng" value={`${k.usedCount}/${k.maxUses}`} />
            <InfoRow label="Tạo ngày" value={fmtDate(k.createdAt)} />
            <InfoRow label="Hạn dùng" value={tl.label} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Thông tin tuỳ chỉnh cho key này</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="VD: khách VIP, ưu tiên hỗ trợ, ghi chú nội bộ..."
              className={inputCls + " resize-none"}
            />
            <div className="flex justify-end mt-2">
              <button onClick={() => onSaveNote(note)} className="px-3 py-1.5 rounded-lg text-xs bg-pink-500 hover:bg-pink-600 text-white font-medium">
                Lưu thông tin
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
              <MessageSquare size={13} /> Gửi tin nhắn đến người dùng key này
            </label>
            <div className="flex gap-2">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Nhập nội dung tin nhắn..."
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && msg.trim()) {
                    onSendMessage(msg.trim());
                    setMsg("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!msg.trim()) return;
                  onSendMessage(msg.trim());
                  setMsg("");
                }}
                className="px-3 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white shrink-0"
                title="Gửi"
              >
                <Send size={15} />
              </button>
            </div>

            <div className="mt-3 space-y-2 max-h-40 overflow-auto">
              {(!k.messages || k.messages.length === 0) ? (
                <p className="text-xs text-gray-400">Chưa gửi tin nhắn nào đến key này.</p>
              ) : (
                [...k.messages].reverse().map((m, i) => (
                  <div key={i} className="bg-pink-50 border border-pink-100 rounded-lg px-3 py-2">
                    <p className="text-sm text-pink-700">{m.text}</p>
                    <p className="text-[10px] text-pink-400 mt-0.5">{new Date(m.sentAt).toLocaleString("vi-VN")}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Usage info ----------
function UsageInfo({ activePackage, keys }) {
  if (!activePackage) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Thông tin gói đang sử dụng</h1>
        <EmptyState text="Chưa có package nào được tạo." />
      </div>
    );
  }
  const pkgKeys = keys.filter((k) => k.packageId === activePackage.id);
  const activeKeys = pkgKeys.filter((k) => !timeLeft(k.expiresAt).expired && !k.banned);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Thông tin gói đang sử dụng</h1>
      <p className="text-sm text-gray-400 mb-6">Chi tiết package hiện đang hoạt động chính</p>

      <div className="bg-white border border-pink-100 rounded-2xl p-6 shadow-sm max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">{activePackage.name}</h2>
          <Badge tone={activePackage.status === "active" ? "green" : "amber"}>
            {activePackage.status === "active" ? "Đang hoạt động" : "Bảo trì"}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mb-5">{activePackage.description || "Không có mô tả."}</p>

        <div className="grid grid-cols-2 gap-4 text-sm mb-5">
          <InfoRow label="Version" value={`v${activePackage.version}`} />
          <InfoRow label="Ngày tạo" value={fmtDate(activePackage.createdAt)} />
          <InfoRow label="Tổng key" value={pkgKeys.length} />
          <InfoRow label="Key còn hoạt động" value={activeKeys.length} />
          <InfoRow label="Free login" value={activePackage.allowFreeLogin ? "Bật" : "Tắt"} />
          <InfoRow label="UID thật từ iOS" value={activePackage.getRealUidIOS ? "Bật" : "Tắt"} />
        </div>

        <div className="space-y-2">
          <div>
            <span className="text-xs text-gray-400">API Key</span>
            <div className="mt-1"><CopyField value={activePackage.apiKey} /></div>
          </div>
          <div>
            <span className="text-xs text-gray-400">Token</span>
            <div className="mt-1"><CopyField value={activePackage.token} /></div>
          </div>
          {activePackage.contactLink && (
            <div className="text-sm"><span className="text-gray-400">Liên hệ: </span><a className="text-pink-600 hover:underline" href={activePackage.contactLink}>{activePackage.contactLink}</a></div>
          )}
          {activePackage.updateLink && (
            <div className="text-sm"><span className="text-gray-400">Cập nhật app: </span><a className="text-pink-600 hover:underline" href={activePackage.updateLink}>{activePackage.updateLink}</a></div>
          )}
          {activePackage.notifyMessage && (
            <div className="mt-3 text-sm bg-pink-50 border border-pink-100 rounded-lg px-3 py-2 text-pink-700">
              📢 {activePackage.notifyMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-700">{value}</p>
    </div>
  );
}

// ---------- Docs ----------
function Docs({ activePackage }) {
  const snippet = `POST https://api.yourserver.dev/v1/verify
Headers:
  Authorization: Bearer ${activePackage ? activePackage.apiKey : "<API_KEY>"}
Body (JSON):
  {
    "key": "<KEY_NGUOI_DUNG_NHAP>",
    "uid": "<UID_THIET_BI>"
  }

Phan hoi:
  200 OK  -> key hop le, tra ve thong tin package
  403     -> key sai / het han / da bi ban
  423     -> package dang bao tri`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Tài liệu &amp; Tích hợp API</h1>
      <p className="text-sm text-gray-400 mb-6">Hai bước để gắn hệ thống key vào ứng dụng của bạn</p>

      <div className="space-y-5 max-w-3xl">
        <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-semibold">1</span>
            <h3 className="font-semibold text-gray-700 text-sm">Download source API</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">Tải mã nguồn API server mẫu để tự triển khai hoặc tham khảo cách xác thực key.</p>
          <button
            onClick={() => alert("Đây là bản demo giao diện — kết nối kho mã nguồn thật của bạn để tải file.")}
            className="flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl"
          >
            <Download size={15} /> Download Source API
          </button>
        </div>

        <div className="bg-white border border-pink-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs flex items-center justify-center font-semibold">2</span>
            <h3 className="font-semibold text-gray-700 text-sm">Hướng dẫn gắn key vào app</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Gửi request xác thực mỗi khi người dùng nhập key trong app. Nếu package bật <span className="font-medium">"Lấy UID thật từ iOS"</span>,
            hãy đính kèm UID thiết bị thật lấy từ <code className="bg-pink-50 px-1 rounded">identifierForVendor</code>.
          </p>
          <pre className="bg-gray-900 text-pink-100 text-xs rounded-xl p-4 overflow-x-auto font-mono leading-relaxed">{snippet}</pre>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <Book size={13} /> Xem thêm mã lỗi và ví dụ SDK trong source đã tải ở bước 1.
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-14 border-2 border-dashed border-pink-100 rounded-2xl">
      <KeyRound size={28} className="mx-auto text-pink-200 mb-3" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
