'use client';

import React, { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// -------------------------------------------------------------
// Aplicativo "Termitas" – app/page.jsx (Next.js listo para Vercel)
// -------------------------------------------------------------
// Nota: Este archivo reemplaza por completo el contenido previo.
// Se removieron fragmentos inválidos (package.json, vite.config, etc.)
// que generaban errores de sintaxis. Todo el código de la app vive aquí.
// -------------------------------------------------------------

// --- Datos base (tabla de tarifas) ---
const TARIFFS = [
  // TRABAJO EN BODEGA – MELAZA
  { id: "env_dia", tipo: "TRABAJO EN BODEGA", categoria: "MELAZA", actividad: "ENVASADO DÍA", unidad: "SACO", tarifa: 0.12 },
  { id: "env_noche", tipo: "TRABAJO EN BODEGA", categoria: "MELAZA", actividad: "ENVASADO NOCHE", unidad: "SACO", tarifa: 0.15 },
  { id: "tanquero", tipo: "TRABAJO EN BODEGA", categoria: "MELAZA", actividad: "TANQUERO", unidad: "SACO", tarifa: 0.15 },

  // TRABAJO EN BODEGA – ESTIBAS
  { id: "est_silicato", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "SILICATO", unidad: "SACO", tarifa: 0.05 },
  { id: "est_melaza", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "MELAZA", unidad: "SACO", tarifa: 0.05 },
  { id: "est_cal", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "CAL", unidad: "SACO", tarifa: 0.05 },
  { id: "est_carbonato", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "CARBONATO", unidad: "SACO", tarifa: 0.08 },
  { id: "est_sal", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "SAL", unidad: "SACO", tarifa: 0.08 },

  // IMPORTACIÓN – SILICATO
  { id: "imp_sil_plataforma", tipo: "IMPORTACIÓN", categoria: "SILICATO", actividad: "PLATAFORMA", unidad: "CARRETA", tarifa: 100.0 },
  { id: "imp_sil_contenedor", tipo: "IMPORTACIÓN", categoria: "SILICATO", actividad: "CONTENEDOR", unidad: "CONTENEDOR", tarifa: 90.0 },

  // IMPORTACIÓN – SAL
  { id: "imp_sal_plataforma", tipo: "IMPORTACIÓN", categoria: "SAL", actividad: "PLATAFORMA", unidad: "CARRETA", tarifa: 80.0 },
  { id: "imp_sal_contenedor", tipo: "IMPORTACIÓN", categoria: "SAL", actividad: "CONTENEDOR", unidad: "CONTENEDOR", tarifa: 80.0 },
];

// Utilidad para formatear valores monetarios USD
const money = (n) => n.toLocaleString("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function Page() {
  const [registros, setRegistros] = useState([]); // [{uid,id,qty,nota,fecha}]
  const [showForm, setShowForm] = useState(null); // id del item a registrar
  const [qty, setQty] = useState(1);
  const [nota, setNota] = useState("");
  const [obra, setObra] = useState("Termitas – Cuadrilla");
  const [responsable, setResponsable] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  // Navegación jerárquica
  const [selectedTipo, setSelectedTipo] = useState(null); // "TRABAJO EN BODEGA" | "IMPORTACIÓN" | null
  const [selectedCategoria, setSelectedCategoria] = useState(null); // p. ej. "MELAZA"

  const tipos = useMemo(() => Array.from(new Set(TARIFFS.map((t) => t.tipo))), []);
  const categoriasPorTipo = useMemo(() => {
    const map = {};
    tipos.forEach((tp) => {
      map[tp] = Array.from(new Set(TARIFFS.filter((t) => t.tipo === tp).map((t) => t.categoria)));
    });
    return map;
  }, [tipos]);

  const actividadesVisibles = useMemo(() => {
    if (!selectedTipo || !selectedCategoria) return [];
    return TARIFFS.filter((t) => t.tipo === selectedTipo && t.categoria === selectedCategoria);
  }, [selectedTipo, selectedCategoria]);

  const addRegistro = (id, qty, nota) => {
    setRegistros((prev) => [
      ...prev,
      { uid: crypto.randomUUID(), id, qty: Number(qty) || 0, nota: nota?.trim() || "", fecha: new Date().toISOString() },
    ]);
  };

  const removeRegistro = (uid) => setRegistros((prev) => prev.filter((r) => r.uid !== uid));

  const clean = () => {
    if (confirm("¿Borrar todos los registros?")) setRegistros([]);
  };

  // Totales por registro y general
  const rows = useMemo(
    () =>
      registros.map((r) => {
        const t = TARIFFS.find((x) => x.id === r.id);
        const subtotal = (t?.tarifa || 0) * r.qty;
        return { ...r, ...t, subtotal };
      }),
    [registros]
  );

  const totalGeneral = useMemo(() => rows.reduce((acc, r) => acc + r.subtotal, 0), [rows]);

  // Exportar a PDF del reporte — asegurando colores soportados por html2canvas
  const reportRef = useRef(null);
  const exportPDF = async () => {
    try {
      const el = reportRef.current;
      if (!el) return;
      el.setAttribute("data-exporting", "true");
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        pdf.addPage();
        position = position - pageHeight;
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("parte-termitas.pdf");
      el.removeAttribute("data-exporting");
    } catch (err) {
      console.error(err);
      alert("No se pudo exportar a PDF. Revisa navegador/versión o compártemelos para adaptar.");
    }
  };

  const imprimir = () => window.print();

  // ======================
  // TEST CASES (manuales)
  // ======================
  const cargarPruebas = () => {
    const now = new Date().toISOString();
    setRegistros([
      // Original + adicionales
      { uid: crypto.randomUUID(), id: "env_dia", qty: 120, nota: "Turno mañana", fecha: now },
      { uid: crypto.randomUUID(), id: "imp_sil_contenedor", qty: 1, nota: "Ingreso puerto", fecha: now },
      { uid: crypto.randomUUID(), id: "est_cal", qty: 40, nota: "Estiba bodega 2", fecha: now },
      { uid: crypto.randomUUID(), id: "imp_sal_plataforma", qty: 1, nota: "Plataforma frontera", fecha: now },
    ]);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f7fa", color: "#111827" }}>
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Encabezado */}
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Registro de trabajos – "Termitas"</h1>
            <p className="text-sm" style={{ color: "#6b7280" }}>Listado con descripción, totales por trabajo y sumatoria final.</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button onClick={exportPDF} className="px-3 py-2 rounded-xl shadow" style={{ backgroundColor: "#059669", color: "#ffffff" }}>Exportar PDF</button>
            <button onClick={imprimir} className="px-3 py-2 rounded-xl shadow" style={{ backgroundColor: "#111827", color: "#ffffff" }}>Imprimir / Guardar PDF</button>
            <button onClick={clean} className="px-3 py-2 rounded-xl border shadow bg-white">Limpiar</button>
            <button onClick={cargarPruebas} className="px-3 py-2 rounded-xl border shadow bg-white" title="Añade filas de ejemplo para probar">Datos de prueba</button>
          </div>
        </header>

        {/* Datos del parte */}
        <section className="grid md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl shadow mb-6">
          <div className="col-span-2">
            <label className="text-xs uppercase tracking-wide">Obra / Frente</label>
            <input value={obra} onChange={(e)=>setObra(e.target.value)} className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide">Responsable</label>
            <input value={responsable} onChange={(e)=>setResponsable(e.target.value)} className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide">Fecha</label>
            <input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} className="w-full border rounded-xl px-3 py-2" />
          </div>
        </section>

        {/* Selector jerárquico */}
        <section className="mb-6 print:hidden">
          {/* Nivel 1: Tipo */}
          {!selectedTipo && (
            <div>
              <h3 className="mb-2 font-semibold">1) Selecciona el TIPO de trabajo</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {tipos.map((tp) => (
                  <button key={tp} onClick={() => { setSelectedTipo(tp); setSelectedCategoria(null); }} className="text-left bg-white hover:bg-neutral-50 border rounded-2xl p-4 shadow">
                    <div className="text-[11px] uppercase" style={{ color: "#6b7280" }}>Tipo</div>
                    <div className="font-semibold text-lg leading-tight">{tp}</div>
                    <div className="text-sm" style={{ color: "#6b7280" }}>{categoriasPorTipo[tp].length} subcategorías</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nivel 2: Categoría */}
          {selectedTipo && !selectedCategoria && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">2) {selectedTipo} – elige una CATEGORÍA</h3>
                <button onClick={() => setSelectedTipo(null)} className="text-sm underline">← Volver a tipos</button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoriasPorTipo[selectedTipo].map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategoria(cat)} className="text-left bg-white hover:bg-neutral-50 border rounded-2xl p-4 shadow">
                    <div className="text-[11px] uppercase" style={{ color: "#6b7280" }}>Categoría</div>
                    <div className="font-semibold text-lg leading-tight">{cat}</div>
                    <div className="text-sm" style={{ color: "#6b7280" }}>{TARIFFS.filter(t=>t.tipo===selectedTipo && t.categoria===cat).length} actividades</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nivel 3: Actividades */}
          {selectedTipo && selectedCategoria && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">3) {selectedTipo} • {selectedCategoria} – elige una ACTIVIDAD</h3>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setSelectedCategoria(null)} className="underline">← Cambiar categoría</button>
                  <button onClick={() => setSelectedTipo(null)} className="underline">← Cambiar tipo</button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {actividadesVisibles.map((t) => (
                  <button key={t.id} onClick={() => { setShowForm(t.id); setQty(1); setNota(""); }} className="text-left bg-white hover:bg-neutral-50 border rounded-2xl p-4 shadow">
                    <div className="text-[11px] uppercase" style={{ color: "#6b7280" }}>{t.tipo} • {t.categoria}</div>
                    <div className="font-semibold text-lg leading-tight">{t.actividad}</div>
                    <div className="text-sm" style={{ color: "#6b7280" }}>Unidad: <span className="font-medium">{t.unidad}</span></div>
                    <div className="mt-2 font-bold">{money(t.tarifa)}<span className="font-normal text-sm" style={{ color: "#6b7280" }}> / {t.unidad.toLowerCase()}</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Listado generado */}
        <section ref={reportRef} className="bg-white rounded-2xl shadow overflow-hidden" style={{ backgroundColor: "#ffffff", color: "#111827" }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
            <h2 className="font-semibold">Listado de trabajos</h2>
            <span className="text-sm" style={{ color: "#6b7280" }}>Registros: {rows.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-100" style={{ backgroundColor: "#f5f5f5" }}>
                <tr>
                  <th className="text-left p-3">Fecha/Hora</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Categoría</th>
                  <th className="text-left p-3">Actividad</th>
                  <th className="text-left p-3">Unidad</th>
                  <th className="text-right p-3">Cantidad</th>
                  <th className="text-right p-3">Tarifa</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Notas</th>
                  <th className="p-3 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-6 text-center" style={{ color: "#6b7280" }}>Sin registros. Usa el selector superior para añadir trabajos.</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.uid} className="border-t" style={r.tipo === "IMPORTACIÓN" ? { backgroundColor: "#e6f2ff" } : undefined}>
                    <td className="p-3 whitespace-nowrap">{new Date(r.fecha).toLocaleString()}</td>
                    <td className="p-3">{r.tipo}</td>
                    <td className="p-3">{r.categoria}</td>
                    <td className="p-3">{r.actividad}</td>
                    <td className="p-3">{r.unidad}</td>
                    <td className="p-3 text-right font-medium">{r.qty}</td>
                    <td className="p-3 text-right">{money(r.tarifa)}</td>
                    <td className="p-3 text-right font-bold">{money(r.subtotal)}</td>
                    <td className="p-3 max-w-[28ch] truncate" title={r.nota}>{r.nota}</td>
                    <td className="p-3 print:hidden">
                      <button onClick={()=>removeRegistro(r.uid)} className="underline" style={{ color: "#dc2626" }}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50 border-t" style={{ backgroundColor: "#fafafa" }}>
                  <td colSpan={7} className="p-3 text-right font-semibold">TOTAL GENERAL</td>
                  <td className="p-3 text-right font-extrabold">{money(totalGeneral)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pie con metadatos */}
          <div className="px-4 py-3 border-t grid md:grid-cols-3 gap-3 text-sm" style={{ borderColor: "#e5e7eb" }}>
            <div><span className="uppercase text-[11px]" style={{ color: "#6b7280" }}>Obra/Frente</span><div className="font-medium">{obra}</div></div>
            <div><span className="uppercase text-[11px]" style={{ color: "#6b7280" }}>Responsable</span><div className="font-medium">{responsable || "—"}</div></div>
            <div><span className="uppercase text-[11px]" style={{ color: "#6b7280" }}>Fecha</span><div className="font-medium">{new Date(fecha + "T00:00:00").toLocaleDateString()}</div></div>
          </div>
        </section>
      </div>

      {/* Modal simple para ingresar cantidad y nota */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-end md:items-center md:justify-center z-50 print:hidden" onClick={()=>setShowForm(null)}>
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl p-4 md:p-6" onClick={(e)=>e.stopPropagation()}>
            {(() => {
              const t = TARIFFS.find((x) => x.id === showForm);
              if (!t) return null;
              return (
                <>
                  <h3 className="text-lg font-semibold mb-1">Añadir trabajo</h3>
                  <p className="text-sm" style={{ color: "#6b7280" }}>{t.tipo} • {t.categoria} — <span className="font-medium">{t.actividad}</span> ({t.unidad}) · Tarifa: <span className="font-semibold">{money(t.tarifa)}</span></p>

                  <div className="grid gap-3">
                    <label className="text-sm">Cantidad ({t.unidad})
                      <input type="number" min={1} step={1} value={qty} onChange={(e)=>setQty(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2" />
                    </label>

                    <label className="text-sm">Notas (opcional)
                      <textarea value={nota} onChange={(e)=>setNota(e.target.value)} rows={3} className="mt-1 w-full border rounded-xl px-3 py-2" placeholder="Ej.: turno, placa, detalle del trabajo"/>
                    </label>
                  </div>

                  <div className="flex gap-2 justify-end mt-5">
                    <button onClick={()=>setShowForm(null)} className="px-3 py-2 rounded-xl border">Cancelar</button>
                    <button onClick={()=>{ addRegistro(showForm, qty, nota); setShowForm(null); }} className="px-3 py-2 rounded-xl" style={{ backgroundColor: "#111827", color: "#ffffff" }}>Añadir</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Estilos de impresión y exportación (colores seguros; nada de OKLCH) */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        [data-exporting='true'] { background:#ffffff !important; color:#111827 !important; }
        [data-exporting='true'] table thead { background:#f5f5f5 !important; }
        [data-exporting='true'] tfoot tr { background:#fafafa !important; }
        [data-exporting='true'] tr[data-imp='1'] { background:#e6f2ff !important; }
      `}</style>
    </div>
  );
}
