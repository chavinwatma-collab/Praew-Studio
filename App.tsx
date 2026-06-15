import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Package, Wrench, Users, BarChart3, Plus, Trash2, Search, X, Printer, AlertTriangle, Check, Clock, ChevronRight } from 'lucide-react';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// ---------- Helpers ----------
const THB = (n) => `฿${Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);

const STATUS_FLOW = ['รอตรวจ', 'กำลังซ่อม', 'รออะไหล่', 'ซ่อมเสร็จ', 'รับเครื่องแล้ว'];
const STATUS_COLOR = {
  'รอตรวจ': '#9CA3AF',
  'กำลังซ่อม': '#2563EB',
  'รออะไหล่': '#D97706',
  'ซ่อมเสร็จ': '#059669',
  'รับเครื่องแล้ว': '#6B7280',
};

// Firestore: all shop data lives in one document for simplicity
const SHOP_DOC = doc(db, 'shops', 'main');

const seedData = () => ({
  products: [
    { id: uid('p_'), name: 'เคส iPhone 15 Pro', sku: 'CASE-IP15P', category: 'เคส', price: 250, cost: 90, stock: 24, minStock: 5 },
    { id: uid('p_'), name: 'ฟิล์มกระจกกันรอย 9D', sku: 'FILM-9D', category: 'ฟิล์ม', price: 120, cost: 30, stock: 50, minStock: 10 },
    { id: uid('p_'), name: 'สายชาร์จ USB-C 1m', sku: 'CABLE-USBC', category: 'สายชาร์จ', price: 150, cost: 50, stock: 8, minStock: 10 },
    { id: uid('p_'), name: 'หัวชาร์จ 20W', sku: 'ADAPT-20W', category: 'อะแดปเตอร์', price: 290, cost: 130, stock: 15, minStock: 5 },
    { id: uid('p_'), name: 'หูฟังบลูทูธ TWS', sku: 'EARBUD-TWS', category: 'หูฟัง', price: 590, cost: 280, stock: 3, minStock: 5 },
    { id: uid('p_'), name: 'แบตเตอรี่สำรอง 10000mAh', sku: 'PWB-10K', category: 'พาวเวอร์แบงค์', price: 450, cost: 220, stock: 12, minStock: 4 },
  ],
  customers: [
    { id: uid('c_'), name: 'คุณสมชาย ใจดี', phone: '081-234-5678', note: '' },
    { id: uid('c_'), name: 'คุณพิมพ์ ศรีสุข', phone: '089-876-5432', note: 'ลูกค้าประจำ' },
  ],
  sales: [],
  repairs: [
    { id: uid('r_'), customerId: null, customerName: 'คุณวิชัย รุ่งเรือง', phone: '062-111-2233', device: 'iPhone 12', issue: 'จอแตก เปิดไม่ติด', status: 'กำลังซ่อม', cost: 1800, deposit: 500, createdAt: nowTime(), notes: '' },
  ],
});

// ---------- App ----------
export default function App() {
  const [data, setData] = useState(null); // null = still loading
  const [tab, setTab] = useState('pos');
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load + subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(SHOP_DOC, (snap) => {
      if (snap.exists()) {
        setData(snap.data());
      } else {
        // First time: seed the database
        const seed = seedData();
        setDoc(SHOP_DOC, seed).catch(e => console.error('Seed failed', e));
        setData(seed);
      }
    }, (err) => {
      console.error('Firestore subscribe failed', err);
      setData(seedData());
    });
    return () => unsubscribe();
  }, []);

  // Save to Firestore whenever data changes (debounced)
  useEffect(() => {
    if (data === null) return;
    setSaving(true);
    const t = setTimeout(async () => {
      try {
        await setDoc(SHOP_DOC, data);
      } catch (e) {
        console.error('Save failed', e);
      } finally {
        setSaving(false);
      }
    }, 500); // debounce
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (msg, type = 'success') => setToast({ msg, type, key: uid() });

  const tabs = [
    { id: 'pos', label: 'ขายหน้าร้าน', icon: ShoppingCart },
    { id: 'stock', label: 'คลังสินค้า', icon: Package },
    { id: 'repairs', label: 'รับซ่อม', icon: Wrench },
    { id: 'customers', label: 'ลูกค้า', icon: Users },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
  ];

  if (data === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F7F5', fontFamily: "'Sarabun', sans-serif" }}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');`}</style>
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
          <div style={{ fontWeight: 600 }}>กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  const lowStockCount = data.products.filter(p => p.stock <= p.minStock).length;
  const activeRepairs = data.repairs.filter(r => r.status !== 'รับเครื่องแล้ว').length;

  return (
    <div style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif", minHeight: '100vh', background: '#F7F7F5', color: '#1F2430' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button { font-family: inherit; cursor: pointer; }
        input, select, textarea { font-family: inherit; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <header style={{ background: '#1E293B', color: '#fff', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>📱</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: 0.2 }}>ระบบจัดการร้านโทรศัพท์</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saving && <span style={{ fontSize: 11.5, color: '#94A3B8' }}>กำลังบันทึก...</span>}
          {lowStockCount > 0 && (
            <Badge color="#F59E0B" icon={<AlertTriangle size={13} />} label={`สต็อกใกล้หมด ${lowStockCount}`} onClick={() => setTab('stock')} />
          )}
          {activeRepairs > 0 && (
            <Badge color="#3B82F6" icon={<Wrench size={13} />} label={`งานซ่อม ${activeRepairs}`} onClick={() => setTab('repairs')} />
          )}
        </div>
      </header>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 4, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #E5E7EB', overflowX: 'auto', position: 'sticky', top: 64, zIndex: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
            border: 'none', background: tab === t.id ? '#1E293B' : 'transparent',
            color: tab === t.id ? '#fff' : '#4B5563', fontWeight: 600, fontSize: 14,
            transition: 'all .15s', whiteSpace: 'nowrap'
          }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
        {tab === 'pos' && <POS data={data} setData={setData} notify={notify} />}
        {tab === 'stock' && <Stock data={data} setData={setData} notify={notify} />}
        {tab === 'repairs' && <Repairs data={data} setData={setData} notify={notify} />}
        {tab === 'customers' && <Customers data={data} setData={setData} notify={notify} />}
        {tab === 'reports' && <Reports data={data} />}
      </main>

      {toast && (
        <div key={toast.key} style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#DC2626' : '#1E293B', color: '#fff',
          padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeUp .25s ease', zIndex: 100
        }}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />} {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeUp { from { opacity:0; transform: translate(-50%, 10px); } to { opacity:1; transform: translate(-50%,0); } }`}</style>
    </div>
  );
}

function Badge({ color, icon, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, background: `${color}22`, color,
      border: `1px solid ${color}55`, borderRadius: 999, padding: '6px 12px', fontSize: 12.5, fontWeight: 700
    }}>{icon}{label}</button>
  );
}

function Card({ children, style }) {
  return <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ECECE9', padding: 16, ...style }}>{children}</div>;
}

function Empty({ icon, title, hint }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{hint}</div>
    </div>
  );
}

// ============ POS ============
function POS({ data, setData, notify }) {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]); // {productId, qty}
  const [payMethod, setPayMethod] = useState('เงินสด');

  const products = data.products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())
  );

  const addToCart = (product) => {
    if (product.stock <= 0) { notify('สินค้าหมดสต็อก', 'error'); return; }
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) { notify('จำนวนเกินสต็อกที่มี', 'error'); return prev; }
        return prev.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { productId: product.id, qty: 1 }];
    });
  };

  const changeQty = (productId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      const product = data.products.find(p => p.id === productId);
      const newQty = c.qty + delta;
      if (newQty < 1) return c;
      if (newQty > product.stock) { notify('จำนวนเกินสต็อกที่มี', 'error'); return c; }
      return { ...c, qty: newQty };
    }).filter(c => c.qty > 0));
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(c => c.productId !== productId));

  const cartItems = cart.map(c => {
    const product = data.products.find(p => p.id === c.productId);
    return { ...c, product };
  }).filter(c => c.product);

  const total = cartItems.reduce((sum, c) => sum + c.product.price * c.qty, 0);

  const checkout = () => {
    if (cartItems.length === 0) { notify('ยังไม่มีสินค้าในตะกร้า', 'error'); return; }
    const sale = {
      id: uid('s_'),
      items: cartItems.map(c => ({ productId: c.product.id, name: c.product.name, price: c.product.price, qty: c.qty })),
      total,
      payMethod,
      date: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      sales: [sale, ...prev.sales],
      products: prev.products.map(p => {
        const item = cartItems.find(c => c.product.id === p.id);
        return item ? { ...p, stock: p.stock - item.qty } : p;
      }),
    }));
    setCart([]);
    notify(`ขายสำเร็จ รวม ${THB(total)}`);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Product grid */}
        <Card style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#9CA3AF' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาสินค้า ชื่อ หรือ SKU..."
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
            {products.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0}
                style={{
                  textAlign: 'left', border: '1px solid #ECECE9', borderRadius: 12, padding: 12, background: p.stock <= 0 ? '#F9FAFB' : '#fff',
                  opacity: p.stock <= 0 ? 0.5 : 1, display: 'flex', flexDirection: 'column', gap: 4, transition: 'border-color .15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#F97316'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#ECECE9'}
              >
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#F97316' }}>{THB(p.price)}</div>
                <div style={{ fontSize: 11.5, color: p.stock <= p.minStock ? '#D97706' : '#9CA3AF' }}>คงเหลือ {p.stock} {p.stock <= p.minStock && '⚠️'}</div>
              </button>
            ))}
            {products.length === 0 && <Empty icon="🔍" title="ไม่พบสินค้า" hint="ลองค้นหาด้วยคำอื่น" />}
          </div>
        </Card>

        {/* Cart */}
        <Card style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={17} /> ตะกร้าสินค้า {cartItems.length > 0 && <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12, padding: '2px 8px', borderRadius: 999 }}>{cartItems.length}</span>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360, marginBottom: 12 }}>
            {cartItems.length === 0 && <Empty icon="🛒" title="ตะกร้าว่าง" hint="แตะที่สินค้าเพื่อเพิ่มลงตะกร้า" />}
            {cartItems.map(c => (
              <div key={c.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.product.name}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{THB(c.product.price)} × {c.qty}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => changeQty(c.productId, -1)} style={qtyBtn}>−</button>
                  <span style={{ fontSize: 13, fontWeight: 700, width: 22, textAlign: 'center' }}>{c.qty}</span>
                  <button onClick={() => changeQty(c.productId, 1)} style={qtyBtn}>+</button>
                  <button onClick={() => removeFromCart(c.productId)} style={{ ...qtyBtn, color: '#DC2626', border: 'none' }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #ECECE9', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              <span>รวมทั้งหมด</span><span style={{ color: '#F97316' }}>{THB(total)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['เงินสด', 'โอน/QR', 'บัตร'].map(m => (
                <button key={m} onClick={() => setPayMethod(m)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: payMethod === m ? '2px solid #1E293B' : '1px solid #E5E7EB',
                  background: payMethod === m ? '#1E293B' : '#fff', color: payMethod === m ? '#fff' : '#4B5563', fontSize: 12.5, fontWeight: 600
                }}>{m}</button>
              ))}
            </div>
            <button onClick={checkout} style={{
              width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: '#F97316', color: '#fff',
              fontWeight: 700, fontSize: 15.5
            }}>ยืนยันการขาย</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
const qtyBtn = { width: 26, height: 26, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#4B5563' };

// ============ STOCK ============
function Stock({ data, setData, notify }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // product object or 'new'

  const products = data.products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()));

  const saveProduct = (form) => {
    if (!form.name.trim()) { notify('กรุณากรอกชื่อสินค้า', 'error'); return; }
    if (form.id) {
      setData(prev => ({ ...prev, products: prev.products.map(p => p.id === form.id ? form : p) }));
      notify('แก้ไขสินค้าแล้ว');
    } else {
      setData(prev => ({ ...prev, products: [...prev.products, { ...form, id: uid('p_') }] }));
      notify('เพิ่มสินค้าแล้ว');
    }
    setEditing(null);
  };

  const deleteProduct = (id) => {
    setData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== id) }));
    notify('ลบสินค้าแล้ว');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#9CA3AF' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาสินค้า..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14 }} />
        </div>
        <button onClick={() => setEditing('new')} style={primaryBtn}><Plus size={16} /> เพิ่มสินค้า</button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', textAlign: 'left' }}>
                {['สินค้า', 'SKU', 'หมวดหมู่', 'ราคาทุน', 'ราคาขาย', 'คงเหลือ', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', color: '#6B7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '10px 14px', color: '#9CA3AF', fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</td>
                  <td style={{ padding: '10px 14px' }}>{p.category}</td>
                  <td style={{ padding: '10px 14px' }}>{THB(p.cost)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#F97316' }}>{THB(p.price)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                      background: p.stock <= p.minStock ? '#FEF3C7' : '#ECFDF5',
                      color: p.stock <= p.minStock ? '#92400E' : '#047857'
                    }}>{p.stock} {p.stock <= p.minStock && '⚠️'}</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setEditing(p)} style={linkBtn}>แก้ไข</button>
                    <button onClick={() => deleteProduct(p.id)} style={{ ...linkBtn, color: '#DC2626' }}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <Empty icon="📦" title="ไม่มีสินค้า" hint="เพิ่มสินค้าชิ้นแรกของคุณ" />}
        </div>
      </Card>

      {editing && <ProductModal product={editing === 'new' ? null : editing} onSave={saveProduct} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(product || { name: '', sku: '', category: '', price: '', cost: '', stock: '', minStock: 5 });
  return (
    <Modal title={product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'} onClose={onClose}>
      <div style={{ display: 'grid', gap: 10 }}>
        <Field label="ชื่อสินค้า"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="SKU"><input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} style={inputStyle} /></Field>
          <Field label="หมวดหมู่"><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="ราคาทุน (บาท)"><input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} style={inputStyle} /></Field>
          <Field label="ราคาขาย (บาท)"><input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} style={inputStyle} /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="จำนวนคงเหลือ"><input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} style={inputStyle} /></Field>
          <Field label="แจ้งเตือนเมื่อต่ำกว่า"><input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: Number(e.target.value) })} style={inputStyle} /></Field>
        </div>
        <button onClick={() => onSave(form)} style={{ ...primaryBtn, justifyContent: 'center', marginTop: 6 }}>บันทึก</button>
      </div>
    </Modal>
  );
}

// ============ REPAIRS ============
function Repairs({ data, setData, notify }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('ทั้งหมด');

  const saveRepair = (form) => {
    if (!form.device.trim() || !form.customerName.trim()) { notify('กรุณากรอกชื่อลูกค้าและรุ่นเครื่อง', 'error'); return; }
    if (form.id) {
      setData(prev => ({ ...prev, repairs: prev.repairs.map(r => r.id === form.id ? form : r) }));
      notify('บันทึกงานซ่อมแล้ว');
    } else {
      setData(prev => ({ ...prev, repairs: [{ ...form, id: uid('r_'), createdAt: nowTime() }, ...prev.repairs] }));
      notify('รับงานซ่อมแล้ว');
    }
    setEditing(null);
  };

  const deleteRepair = (id) => {
    setData(prev => ({ ...prev, repairs: prev.repairs.filter(r => r.id !== id) }));
    notify('ลบรายการแล้ว');
  };

  const advanceStatus = (repair) => {
    const idx = STATUS_FLOW.indexOf(repair.status);
    if (idx < STATUS_FLOW.length - 1) {
      const newStatus = STATUS_FLOW[idx + 1];
      setData(prev => ({ ...prev, repairs: prev.repairs.map(r => r.id === repair.id ? { ...r, status: newStatus } : r) }));
      notify(`อัปเดตสถานะเป็น "${newStatus}"`);
    }
  };

  const filtered = filter === 'ทั้งหมด' ? data.repairs : data.repairs.filter(r => r.status === filter);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {['ทั้งหมด', ...STATUS_FLOW].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
              border: filter === s ? '2px solid #1E293B' : '1px solid #E5E7EB',
              background: filter === s ? '#1E293B' : '#fff', color: filter === s ? '#fff' : '#4B5563'
            }}>{s}</button>
          ))}
        </div>
        <button onClick={() => setEditing('new')} style={primaryBtn}><Plus size={16} /> รับงานซ่อมใหม่</button>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(r => (
          <Card key={r.id} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{r.device}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: `${STATUS_COLOR[r.status]}1A`, color: STATUS_COLOR[r.status] }}>{r.status}</span>
              </div>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{r.issue}</div>
              <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>{r.customerName} · {r.phone} · รับเมื่อ {r.createdAt}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
              <div style={{ fontSize: 13 }}>ค่าซ่อม <b>{THB(r.cost)}</b>{r.deposit > 0 && <span style={{ color: '#9CA3AF' }}> (มัดจำ {THB(r.deposit)})</span>}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                {r.status !== 'รับเครื่องแล้ว' && (
                  <button onClick={() => advanceStatus(r)} style={smallBtn}><ChevronRight size={13} /> {STATUS_FLOW[STATUS_FLOW.indexOf(r.status) + 1]}</button>
                )}
                <button onClick={() => setEditing(r)} style={smallBtn}>แก้ไข</button>
                <button onClick={() => deleteRepair(r.id)} style={{ ...smallBtn, color: '#DC2626' }}>ลบ</button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <Empty icon="🔧" title="ไม่มีรายการ" hint="ยังไม่มีงานซ่อมในสถานะนี้" />}
      </div>

      {editing && <RepairModal repair={editing === 'new' ? null : editing} customers={data.customers} onSave={saveRepair} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RepairModal({ repair, customers, onSave, onClose }) {
  const [form, setForm] = useState(repair || { customerName: '', phone: '', device: '', issue: '', status: 'รอตรวจ', cost: '', deposit: 0, notes: '' });
  return (
    <Modal title={repair ? 'แก้ไขงานซ่อม' : 'รับงานซ่อมใหม่'} onClose={onClose}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="ชื่อลูกค้า"><input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} style={inputStyle} /></Field>
          <Field label="เบอร์โทร"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} /></Field>
        </div>
        <Field label="รุ่นเครื่อง"><input value={form.device} onChange={e => setForm({ ...form, device: e.target.value })} placeholder="เช่น iPhone 13 Pro" style={inputStyle} /></Field>
        <Field label="อาการ/ปัญหา"><textarea value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="สถานะ">
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
              {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="ค่าซ่อม (บาท)"><input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} style={inputStyle} /></Field>
          <Field label="มัดจำ (บาท)"><input type="number" value={form.deposit} onChange={e => setForm({ ...form, deposit: Number(e.target.value) })} style={inputStyle} /></Field>
        </div>
        <Field label="หมายเหตุ"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
        <button onClick={() => onSave(form)} style={{ ...primaryBtn, justifyContent: 'center', marginTop: 6 }}>บันทึก</button>
      </div>
    </Modal>
  );
}

// ============ CUSTOMERS ============
function Customers({ data, setData, notify }) {
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

  const saveCustomer = (form) => {
    if (!form.name.trim()) { notify('กรุณากรอกชื่อลูกค้า', 'error'); return; }
    if (form.id) {
      setData(prev => ({ ...prev, customers: prev.customers.map(c => c.id === form.id ? form : c) }));
    } else {
      setData(prev => ({ ...prev, customers: [...prev.customers, { ...form, id: uid('c_') }] }));
    }
    notify('บันทึกข้อมูลลูกค้าแล้ว');
    setEditing(null);
  };

  const deleteCustomer = (id) => {
    setData(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== id) }));
    notify('ลบลูกค้าแล้ว');
  };

  const customers = data.customers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query));

  const repairCountFor = (custName) => data.repairs.filter(r => r.customerName === custName).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#9CA3AF' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาชื่อหรือเบอร์โทร..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14 }} />
        </div>
        <button onClick={() => setEditing('new')} style={primaryBtn}><Plus size={16} /> เพิ่มลูกค้า</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {customers.map(c => (
          <Card key={c.id}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{c.name}</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{c.phone}</div>
            {c.note && <div style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 6 }}>{c.note}</div>}
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>ประวัติงานซ่อม: {repairCountFor(c.name)} ครั้ง</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditing(c)} style={smallBtn}>แก้ไข</button>
              <button onClick={() => deleteCustomer(c.id)} style={{ ...smallBtn, color: '#DC2626' }}>ลบ</button>
            </div>
          </Card>
        ))}
        {customers.length === 0 && <Empty icon="👤" title="ไม่มีลูกค้า" hint="เพิ่มลูกค้าคนแรกของคุณ" />}
      </div>
      {editing && <CustomerModal customer={editing === 'new' ? null : editing} onSave={saveCustomer} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CustomerModal({ customer, onSave, onClose }) {
  const [form, setForm] = useState(customer || { name: '', phone: '', note: '' });
  return (
    <Modal title={customer ? 'แก้ไขลูกค้า' : 'เพิ่มลูกค้าใหม่'} onClose={onClose}>
      <div style={{ display: 'grid', gap: 10 }}>
        <Field label="ชื่อลูกค้า"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} /></Field>
        <Field label="เบอร์โทร"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} /></Field>
        <Field label="หมายเหตุ"><textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
        <button onClick={() => onSave(form)} style={{ ...primaryBtn, justifyContent: 'center', marginTop: 6 }}>บันทึก</button>
      </div>
    </Modal>
  );
}

// ============ REPORTS ============
function Reports({ data }) {
  const today = todayISO();
  const todaySales = data.sales.filter(s => s.date.slice(0, 10) === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayProfit = todaySales.reduce((sum, s) => {
    return sum + s.items.reduce((isum, item) => {
      const product = data.products.find(p => p.id === item.productId);
      const cost = product ? product.cost : 0;
      return isum + (item.price - cost) * item.qty;
    }, 0);
  }, 0);

  // Last 7 days revenue
  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const dailyRevenue = days.map(d => data.sales.filter(s => s.date.slice(0, 10) === d).reduce((sum, s) => sum + s.total, 0));
  const maxRev = Math.max(...dailyRevenue, 1);

  // Top products
  const productSales = {};
  data.sales.forEach(s => s.items.forEach(item => {
    productSales[item.name] = (productSales[item.name] || 0) + item.qty;
  }));
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalRevenue = data.sales.reduce((sum, s) => sum + s.total, 0);
  const repairRevenue = data.repairs.filter(r => r.status === 'รับเครื่องแล้ว').reduce((sum, r) => sum + r.cost, 0);
  const stockValue = data.products.reduce((sum, p) => sum + p.cost * p.stock, 0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="ยอดขายวันนี้" value={THB(todayRevenue)} sub={`${todaySales.length} รายการ`} color="#F97316" />
        <StatCard label="กำไรขายวันนี้" value={THB(todayProfit)} sub="ประมาณการ" color="#059669" />
        <StatCard label="ยอดขายรวมทั้งหมด" value={THB(totalRevenue)} sub={`${data.sales.length} ออเดอร์`} color="#2563EB" />
        <StatCard label="รายได้งานซ่อม (เสร็จแล้ว)" value={THB(repairRevenue)} sub={`${data.repairs.filter(r => r.status === 'รับเครื่องแล้ว').length} งาน`} color="#7C3AED" />
        <StatCard label="มูลค่าสต็อกคงเหลือ" value={THB(stockValue)} sub="ราคาทุน" color="#D97706" />
      </div>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>ยอดขาย 7 วันล่าสุด</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
          {dailyRevenue.map((rev, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{rev > 0 ? THB(rev) : ''}</div>
              <div style={{
                width: '100%', borderRadius: 6, background: i === 6 ? '#F97316' : '#FDE0C4',
                height: `${Math.max((rev / maxRev) * 100, 3)}px`, transition: 'height .3s'
              }} />
              <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{new Date(days[i]).toLocaleDateString('th-TH', { weekday: 'short' })}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>สินค้าขายดี</div>
        {topProducts.length === 0 && <Empty icon="📊" title="ยังไม่มีข้อมูลการขาย" hint="ข้อมูลจะแสดงเมื่อมีการขายสินค้า" />}
        {topProducts.map(([name, qty], i) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < topProducts.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#64748B' }}>{i + 1}</div>
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>ขายแล้ว {qty} ชิ้น</div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>รายการขายล่าสุด</div>
        {data.sales.length === 0 && <Empty icon="🧾" title="ยังไม่มีรายการขาย" hint="เริ่มขายที่หน้า 'ขายหน้าร้าน'" />}
        {data.sales.slice(0, 8).map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6', fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.items.map(i => i.name).join(', ').slice(0, 50)}{s.items.map(i => i.name).join(', ').length > 50 ? '...' : ''}</div>
              <div style={{ color: '#9CA3AF', fontSize: 12 }}>{new Date(s.date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} · {s.payMethod}</div>
            </div>
            <div style={{ fontWeight: 700, color: '#F97316' }}>{THB(s.total)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <Card style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
    </Card>
  );
}

// ============ Shared UI ============
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ border: 'none', background: '#F3F4F6', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none' };
const primaryBtn = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: 'none', background: '#1E293B', color: '#fff', fontWeight: 700, fontSize: 14 };
const smallBtn = { display: 'flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#4B5563', fontWeight: 600, fontSize: 12.5 };
const linkBtn = { border: 'none', background: 'none', color: '#2563EB', fontWeight: 600, fontSize: 12.5, padding: '4px 8px', cursor: 'pointer' };
