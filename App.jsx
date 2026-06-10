import React, { useState, useEffect, useMemo } from "react";
import {
  Utensils, Bus, GraduationCap, HeartPulse, Film, Shirt, Package,
  Plus, Trash2, TrendingUp, Target, Wallet, PiggyBank, AlertTriangle, Check, Copy
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

// ---------- Diseño: libro contable moderno ----------
const C = {
  paper: "#F2F4F6",
  card: "#FFFFFF",
  ink: "#1A2433",
  inkSoft: "#5A6679",
  line: "#E2E6EC",
  green: "#1E7A4F",
  greenSoft: "#E6F2EC",
  red: "#BE4430",
  redSoft: "#F8E9E5",
  amber: "#C98A1B",
  amberSoft: "#FBF1DC",
  blue: "#2C5C8F",
};
const FONT_HEAD = "'Space Grotesk', system-ui, sans-serif";
const FONT_NUM = "'IBM Plex Mono', monospace";

const CATS = [
  { id: "Alimentación", icon: Utensils },
  { id: "Transporte", icon: Bus },
  { id: "Estudios", icon: GraduationCap },
  { id: "Salidas", icon: Film },
  { id: "Salud", icon: HeartPulse },
  { id: "Ropa", icon: Shirt },
  { id: "Otros", icon: Package },
];
// Almacenamiento local del navegador (versión publicada fuera de Claude)
const storage = {
  get: async (k) => { const v = localStorage.getItem(k); return v !== null ? { value: v } : null; },
  set: async (k, v) => { localStorage.setItem(k, v); return { key: k }; },
};

const KEY = "joaquin-finanzas-v1";
const hoyISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CL"); // pesos chilenos, sin decimales

export default function MiBolsillo() {
  const [tab, setTab] = useState("hoy");
  const [txs, setTxs] = useState([]);
  const [meta, setMeta] = useState({ nombre: "Mi meta", objetivo: 100000, ahorrado: 0 });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // entrada rápida
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState("Gasto");
  const [cat, setCat] = useState("Alimentación");
  const [desc, setDesc] = useState("");
  const [okFlash, setOkFlash] = useState(false);

  // meta
  const [aporte, setAporte] = useState("");
  const [editMeta, setEditMeta] = useState(false);
  const [mNombre, setMNombre] = useState("");
  const [mObjetivo, setMObjetivo] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(KEY);
        if (r && r.value) {
          const d = JSON.parse(r.value);
          setTxs(d.txs || []);
          if (d.meta) setMeta(d.meta);
        }
      } catch (e) { /* primera vez: sin datos */ }
      setLoaded(true);
    })();
  }, []);

  const persist = async (nTxs, nMeta) => {
    setSaving(true);
    try {
      await storage.set(KEY, JSON.stringify({ txs: nTxs, meta: nMeta }));
    } catch (e) { console.error("No se pudo guardar", e); }
    setSaving(false);
  };

  // ---------- Cálculos ----------
  const hoy = hoyISO();
  const ahora = new Date();
  const diasRestantes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate() - ahora.getDate() + 1;

  const D = useMemo(() => {
    let ing = 0, gas = 0, gasHoy = 0;
    const porCat = {};
    const mesAct = hoy.slice(0, 7);
    for (const t of txs) {
      if (t.tipo === "Ingreso") ing += t.monto;
      else if (t.tipo === "Gasto") {
        gas += t.monto;
        if (t.fecha === hoy) gasHoy += t.monto;
        if (t.fecha.slice(0, 7) === mesAct) porCat[t.cat] = (porCat[t.cat] || 0) + t.monto;
      }
    }
    const saldo = ing - gas - meta.ahorrado; // dinero libre, fuera del fondo de meta
    const limiteHoy = Math.max(0, (saldo + gasHoy) / diasRestantes);
    const uso = limiteHoy > 0 ? gasHoy / limiteHoy : gasHoy > 0 ? 2 : 0;

    // últimos 7 días
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const total = txs.filter((t) => t.tipo === "Gasto" && t.fecha === iso).reduce((s, t) => s + t.monto, 0);
      dias.push({ dia: ["D", "L", "M", "X", "J", "V", "S"][d.getDay()], total: Math.round(total), esHoy: iso === hoy });
    }
    return { ing, gas, gasHoy, saldo, limiteHoy, uso, porCat, dias };
  }, [txs, meta, hoy, diasRestantes]);

  const estado = D.uso > 1 ? "excedido" : D.uso >= 0.8 ? "alerta" : "ok";
  const estadoColor = estado === "excedido" ? C.red : estado === "alerta" ? C.amber : C.green;

  // ---------- Acciones ----------
  const registrar = () => {
    const m = parseFloat(monto);
    if (!m || m <= 0) return;
    const nTxs = [{ id: Date.now(), fecha: hoy, tipo, cat: tipo === "Gasto" ? cat : "Ingreso", desc: desc.trim(), monto: m }, ...txs];
    setTxs(nTxs); persist(nTxs, meta);
    setMonto(""); setDesc("");
    setOkFlash(true); setTimeout(() => setOkFlash(false), 1200);
  };

  const borrar = (id) => {
    const nTxs = txs.filter((t) => t.id !== id);
    setTxs(nTxs); persist(nTxs, meta);
  };

  const apartar = () => {
    const m = parseFloat(aporte);
    if (!m || m <= 0 || m > D.saldo) return;
    const nMeta = { ...meta, ahorrado: meta.ahorrado + m };
    setMeta(nMeta); persist(txs, nMeta); setAporte("");
  };

  const guardarMeta = () => {
    const nMeta = { ...meta, nombre: mNombre.trim() || meta.nombre, objetivo: parseFloat(mObjetivo) || meta.objetivo };
    setMeta(nMeta); persist(txs, nMeta); setEditMeta(false);
  };

  // Exportar a Google Sheets: copia los datos como tabla (TSV) para pegar con Ctrl+V
  const [copiado, setCopiado] = useState(false);
  const exportar = async () => {
    const rows = [
      ["Fecha", "Tipo", "Categoría", "Nota", "Monto"],
      ...[...txs].reverse().map((t) => [t.fecha, t.tipo, t.cat, t.desc || "", t.monto]),
      [],
      ["Apartado a la meta", "", meta.nombre, "", meta.ahorrado],
      ["Saldo libre", "", "", "", Math.round(D.saldo)],
    ];
    const tsv = rows.map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiado(true); setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      // Respaldo para navegadores sin permiso de portapapeles
      const ta = document.createElement("textarea");
      ta.value = tsv; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      setCopiado(true); setTimeout(() => setCopiado(false), 2500);
    }
  };

  if (!loaded)
    return (
      <div style={{ minHeight: "100vh", background: C.paper, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkSoft, fontFamily: FONT_HEAD }}>
        Cargando tu libro de cuentas…
      </div>
    );

  const Chip = ({ active, onClick, children, color }) => (
    <button onClick={onClick} style={{
      padding: "8px 12px", borderRadius: 999, border: `1.5px solid ${active ? color || C.ink : C.line}`,
      background: active ? (color ? color + "14" : C.ink) : C.card,
      color: active ? (color || "#fff") : C.inkSoft,
      fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
    }}>{children}</button>
  );

  const Card = ({ children, style }) => (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.line}`, padding: 16, ...style }}>{children}</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink, fontFamily: FONT_HEAD, maxWidth: 480, margin: "0 auto", paddingBottom: 84 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        input:focus { outline: 2px solid ${C.blue}; outline-offset: 1px; }
        button { transition: transform .06s ease; } button:active { transform: scale(.97); }`}</style>

      {/* Encabezado */}
      <div style={{ padding: "18px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.inkSoft, textTransform: "uppercase" }}>Libro de cuentas</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Mi Bolsillo</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.inkSoft }}>Saldo libre</div>
          <div style={{ fontFamily: FONT_NUM, fontWeight: 600, fontSize: 18, color: D.saldo < 0 ? C.red : C.ink }}>{fmt(D.saldo)}</div>
        </div>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* ---------- PESTAÑA HOY ---------- */}
        {tab === "hoy" && (
          <>
            {/* Sello: disponible hoy */}
            <Card style={{ border: `1.5px solid ${estadoColor}`, position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: estadoColor, fontWeight: 700 }}>
                  Disponible hoy
                </div>
                <div style={{ fontSize: 11, color: C.inkSoft }}>{diasRestantes} días restantes del mes</div>
              </div>
              <div style={{ fontFamily: FONT_NUM, fontSize: 40, fontWeight: 600, margin: "6px 0 2px", color: estadoColor }}>
                {fmt(Math.max(0, D.limiteHoy - D.gasHoy))}
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft, fontFamily: FONT_NUM }}>
                gastado hoy {fmt(D.gasHoy)} de {fmt(D.limiteHoy)}
              </div>
              <div style={{ height: 6, background: C.line, borderRadius: 99, marginTop: 10 }}>
                <div style={{ height: "100%", width: `${Math.min(100, D.uso * 100)}%`, background: estadoColor, borderRadius: 99 }} />
              </div>
              {estado !== "ok" && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10, padding: "8px 10px", borderRadius: 8, background: estado === "excedido" ? C.redSoft : C.amberSoft, color: estadoColor, fontSize: 12.5, fontWeight: 600 }}>
                  <AlertTriangle size={14} />
                  {estado === "excedido"
                    ? "Excediste el límite de hoy: lo gastado se descuenta de los próximos días."
                    : "Estás cerca del límite de hoy."}
                </div>
              )}
            </Card>

            {/* Registro rápido */}
            <Card>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <Chip active={tipo === "Gasto"} color={C.red} onClick={() => setTipo("Gasto")}>Gasto</Chip>
                <Chip active={tipo === "Ingreso"} color={C.green} onClick={() => setTipo("Ingreso")}>Ingreso</Chip>
                {saving && <span style={{ fontSize: 11, color: C.inkSoft, alignSelf: "center" }}>guardando…</span>}
              </div>
              <input
                inputMode="numeric" placeholder="0" value={monto}
                onChange={(e) => setMonto(e.target.value.replace(",", "."))}
                onKeyDown={(e) => e.key === "Enter" && registrar()}
                style={{ width: "100%", boxSizing: "border-box", fontFamily: FONT_NUM, fontSize: 30, fontWeight: 600, border: "none", borderBottom: `2px solid ${C.line}`, padding: "4px 2px", background: "transparent", color: tipo === "Gasto" ? C.red : C.green }}
              />
              {tipo === "Gasto" && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0 2px" }}>
                  {CATS.map(({ id, icon: I }) => (
                    <Chip key={id} active={cat === id} color={C.blue} onClick={() => setCat(id)}>
                      <I size={14} /> {id}
                    </Chip>
                  ))}
                </div>
              )}
              <input
                placeholder="Nota (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && registrar()}
                style={{ width: "100%", boxSizing: "border-box", fontSize: 13, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", marginTop: 10, fontFamily: FONT_HEAD }}
              />
              <button onClick={registrar} style={{ width: "100%", marginTop: 12, padding: 13, borderRadius: 10, border: "none", background: okFlash ? C.green : C.ink, color: "#fff", fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
                {okFlash ? <><Check size={16} /> Registrado</> : <><Plus size={16} /> Registrar</>}
              </button>
            </Card>

            {/* Movimientos recientes */}
            <Card>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: C.inkSoft, marginBottom: 8 }}>Movimientos recientes</div>
              {txs.length === 0 && <div style={{ fontSize: 13, color: C.inkSoft }}>Registra tu primer movimiento arriba.</div>}
              {txs.slice(0, 8).map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px dashed ${C.line}` }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t.tipo === "Ingreso" ? (t.desc || "Ingreso") : t.cat}</div>
                    <div style={{ fontSize: 11, color: C.inkSoft }}>{t.fecha}{t.desc && t.tipo === "Gasto" ? ` · ${t.desc}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: FONT_NUM, fontWeight: 600, fontSize: 14, color: t.tipo === "Ingreso" ? C.green : C.red }}>
                      {t.tipo === "Ingreso" ? "+" : "−"}{fmt(t.monto)}
                    </span>
                    <button onClick={() => borrar(t.id)} aria-label="Eliminar" style={{ border: "none", background: "none", color: C.inkSoft, cursor: "pointer", padding: 4 }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </Card>

            {/* Exportar a Google Sheets */}
            <Card>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: C.inkSoft, marginBottom: 6 }}>Llevar mis datos a Google Sheets</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
                Copia todos tus movimientos como tabla. Luego abre tu hoja en Google Sheets, toca la celda A1 y pega.
              </div>
              <button onClick={exportar} disabled={txs.length === 0} style={{ width: "100%", padding: 12, borderRadius: 10, border: `1.5px solid ${copiado ? C.green : C.ink}`, background: copiado ? C.greenSoft : C.card, color: copiado ? C.green : C.ink, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: txs.length === 0 ? "not-allowed" : "pointer", opacity: txs.length === 0 ? 0.5 : 1 }}>
                {copiado ? <><Check size={16} /> Copiado: pégalo en tu hoja</> : <><Copy size={16} /> Copiar datos para Google Sheets</>}
              </button>
            </Card>
          </>
        )}

        {/* ---------- PESTAÑA HÁBITOS ---------- */}
        {tab === "habitos" && (
          <>
            <Card>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: C.inkSoft, marginBottom: 12 }}>Gasto · últimos 7 días</div>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={D.dias} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fontFamily: FONT_HEAD, fill: C.inkSoft }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fontFamily: FONT_NUM, fill: C.inkSoft }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [fmt(v), "Gasto"]} contentStyle={{ fontFamily: FONT_NUM, fontSize: 12, borderRadius: 8, border: `1px solid ${C.line}` }} />
                    <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                      {D.dias.map((d, i) => <Cell key={i} fill={d.esHoy ? C.ink : "#A9B4C4"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: C.inkSoft, marginBottom: 10 }}>Este mes por categoría</div>
              {Object.keys(D.porCat).length === 0 && <div style={{ fontSize: 13, color: C.inkSoft }}>Sin gastos este mes todavía.</div>}
              {Object.entries(D.porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
                const max = Math.max(...Object.values(D.porCat));
                const Ico = (CATS.find((c) => c.id === k) || { icon: Package }).icon;
                return (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}><Ico size={14} color={C.blue} /> {k}</span>
                      <span style={{ fontFamily: FONT_NUM, fontWeight: 600 }}>{fmt(v)}</span>
                    </div>
                    <div style={{ height: 7, background: C.line, borderRadius: 99 }}>
                      <div style={{ height: "100%", width: `${(v / max) * 100}%`, background: C.blue, borderRadius: 99 }} />
                    </div>
                  </div>
                );
              })}
            </Card>
            <Card style={{ display: "flex", gap: 12 }}>
              {[["Ingresos", D.ing, C.green], ["Gastos", D.gas, C.red], ["En meta", meta.ahorrado, C.blue]].map(([l, v, col]) => (
                <div key={l} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.inkSoft }}>{l}</div>
                  <div style={{ fontFamily: FONT_NUM, fontWeight: 600, fontSize: 15, color: col }}>{fmt(v)}</div>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ---------- PESTAÑA META ---------- */}
        {tab === "meta" && (
          <>
            <Card style={{ border: `1.5px solid ${C.blue}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: C.blue, fontWeight: 700 }}>Meta de ahorro</div>
                <button onClick={() => { setEditMeta(!editMeta); setMNombre(meta.nombre); setMObjetivo(String(meta.objetivo)); }}
                  style={{ border: "none", background: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT_HEAD }}>
                  {editMeta ? "Cancelar" : "Editar"}
                </button>
              </div>
              {!editMeta ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 2px" }}>{meta.nombre}</div>
                  <div style={{ fontFamily: FONT_NUM, fontSize: 15, color: C.inkSoft }}>
                    <span style={{ color: C.ink, fontWeight: 600 }}>{fmt(meta.ahorrado)}</span> de {fmt(meta.objetivo)}
                  </div>
                  <div style={{ height: 10, background: C.line, borderRadius: 99, marginTop: 10 }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (meta.ahorrado / (meta.objetivo || 1)) * 100)}%`, background: C.blue, borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>
                    {meta.ahorrado >= meta.objetivo ? "Meta cumplida." : `Te faltan ${fmt(meta.objetivo - meta.ahorrado)}.`}
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <input value={mNombre} onChange={(e) => setMNombre(e.target.value)} placeholder="Nombre de la meta"
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 14, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", marginBottom: 8, fontFamily: FONT_HEAD }} />
                  <input value={mObjetivo} inputMode="numeric" onChange={(e) => setMObjetivo(e.target.value.replace(",", "."))} placeholder="Monto objetivo"
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 14, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 10px", fontFamily: FONT_NUM }} />
                  <button onClick={guardarMeta} style={{ width: "100%", marginTop: 10, padding: 11, borderRadius: 9, border: "none", background: C.blue, color: "#fff", fontWeight: 700, fontFamily: FONT_HEAD, cursor: "pointer" }}>
                    Guardar meta
                  </button>
                </div>
              )}
            </Card>

            <Card>
              <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: C.inkSoft, marginBottom: 8 }}>Apartar dinero a la meta</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
                Lo apartado sale de tu saldo libre y deja de contar para el gasto diario: así proteges tu ahorro aunque el ingreso sea irregular.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={aporte} inputMode="numeric" onChange={(e) => setAporte(e.target.value.replace(",", "."))} placeholder="0"
                  onKeyDown={(e) => e.key === "Enter" && apartar()}
                  style={{ flex: 1, minWidth: 0, fontFamily: FONT_NUM, fontSize: 16, border: `1px solid ${C.line}`, borderRadius: 9, padding: "10px 12px" }} />
                <button onClick={apartar} style={{ padding: "10px 16px", borderRadius: 9, border: "none", background: C.green, color: "#fff", fontWeight: 700, fontFamily: FONT_HEAD, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <PiggyBank size={15} /> Apartar
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 8, fontFamily: FONT_NUM }}>Saldo libre disponible: {fmt(Math.max(0, D.saldo))}</div>
            </Card>
          </>
        )}
      </div>

      {/* Barra inferior */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto", background: C.card, borderTop: `1px solid ${C.line}`, display: "flex", padding: "6px 8px calc(6px + env(safe-area-inset-bottom))" }}>
        {[
          ["hoy", "Hoy", Wallet],
          ["habitos", "Hábitos", TrendingUp],
          ["meta", "Meta", Target],
        ].map(([id, label, I]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, border: "none", background: "none", padding: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: tab === id ? C.ink : C.inkSoft }}>
            <I size={19} strokeWidth={tab === id ? 2.4 : 1.8} />
            <span style={{ fontSize: 10.5, fontFamily: FONT_HEAD, fontWeight: tab === id ? 700 : 500 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
