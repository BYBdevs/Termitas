'use client';

import React, { useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const TARIFFS = [
  { id: "env_dia", tipo: "TRABAJO EN BODEGA", categoria: "MELAZA", actividad: "ENVASADO DÍA", unidad: "SACO", tarifa: 0.12 },
  { id: "env_noche", tipo: "TRABAJO EN BODEGA", categoria: "MELAZA", actividad: "ENVASADO NOCHE", unidad: "SACO", tarifa: 0.15 },
  { id: "tanquero", tipo: "TRABAJO EN BODEGA", categoria: "MELAZA", actividad: "TANQUERO", unidad: "SACO", tarifa: 0.15 },
  { id: "est_silicato", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "SILICATO", unidad: "SACO", tarifa: 0.05 },
  { id: "est_melaza", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "MELAZA", unidad: "SACO", tarifa: 0.05 },
  { id: "est_cal", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "CAL", unidad: "SACO", tarifa: 0.05 },
  { id: "est_carbonato", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "CARBONATO", unidad: "SACO", tarifa: 0.08 },
  { id: "est_sal", tipo: "TRABAJO EN BODEGA", categoria: "ESTIBAS", actividad: "SAL", unidad: "SACO", tarifa: 0.08 },
  { id: "imp_sil_plataforma", tipo: "IMPORTACIÓN", categoria: "SILICATO", actividad: "PLATAFORMA", unidad: "CARRETA", tarifa: 100.0 },
  { id: "imp_sil_contenedor", tipo: "IMPORTACIÓN", categoria: "SILICATO", actividad: "CONTENEDOR", unidad: "CONTENEDOR", tarifa: 90.0 },
  { id: "imp_sal_plataforma", tipo: "IMPORTACIÓN", categoria: "SAL", actividad: "PLATAFORMA", unidad: "CARRETA", tarifa: 80.0 },
  { id: "imp_sal_contenedor", tipo: "IMPORTACIÓN", categoria: "SAL", actividad: "CONTENEDOR", unidad: "CONTENEDOR", tarifa: 80.0 },
];

const money = (n) => n.toLocaleString("es-EC", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function Page() {
  const [registros, setRegistros] = useState([]);
  const [showForm, setShowForm] = useState(null);
  const [qty, setQty] = useState(1);
  const [nota, setNota] = useState("");
  const [obra, setObra] = useState("Termitas – Cuadrilla");
  const [responsable, setResponsable] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const [selectedTipo, setSelectedTipo] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);

  const tipos = useMemo(() => Array.from(new Set(TARIFFS.map((t) => t.tipo))), []);
  const categoriasPorTipo = useMemo(() => {
    const map = {};
    tipos.forEach((tp) => { map[tp] = Array.from(new Set(TARIFFS.filter((t) => t.tipo === tp).map((t) => t.categoria))); });
    return map;
  }, [tipos]);

  const actividadesVisibles = useMemo(() => {
    if (!selectedTipo || !selectedCategoria) return [];
    return TARIFFS.filter((t) => t.tipo === selectedTipo && t.categoria === selectedCategoria);
  }, [selectedTipo, selectedCategoria]);

  const addRegistro = (id, qty, nota) => {
    setRegistros((prev) => [...prev, { uid: crypto.randomUUID(), id, qty: Number(qty) || 0, nota: nota?.trim() || "", fecha: new Date().toISOString() }]);
  };
  const removeRegistro = (uid) => setRegistros((prev) => prev.filter((r) => r.uid !== uid));
  const clean = () => { if (confirm("¿Borrar todos los registros?")) setRegistros([]); };

  const rows = useMemo(() => registros.map((r) => {
    const t = TARIFFS.find((x) => x.id === r.id);
    const subtotal = (t?.tarifa || 0) * r.qty;
    return { ...r, ...t, subtotal };
  }), [registros]);

  const totalGeneral = useMemo(() => rows.reduce((acc, r) => acc + r.subtotal, 0), [rows]);

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
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let position = margin;
      let heightLeft = imgHeight;

      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      pdf.save("parte-termitas.pdf");
      el.removeAttribute("data-exporting");
    } catch (err) {
      console.error(err);
      alert("No se pudo exportar a PDF. Indícame tu navegador/versión para ajustarlo.");
    }
  };

  const imprimir = () => window.print();

  const cargarPruebas = () => {
    const now = new Date().toISOString();
    setRegistros([
      { uid: crypto.randomUUID(), id: "env_dia", qty: 200, nota: "Turno noche", fecha: now },
      { uid: crypto.randomUUID(), id: "imp_sil_contenedor", qty: 3, nota: "Puerto", fecha: now },
      { uid: crypto.randomUUID(), id: "est_melaza", qty: 5, nota: "Bodega A", fecha: now },
    ]);
  };

  return (
    <div className="ui-root">
      <div className="page">
        <header className="toolbar print-hide">
          <div className="brand">
            <img src="/byb-logo.png" alt="BYB" />
            <div>
              <h1>Termitas – Registro</h1>
              <p>Listado con descripción, subtotales y total general</p>
            </div>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={exportPDF}>Exportar PDF</button>
            <button className="btn dark" onClick={imprimir}>Imprimir</button>
            <button className="btn" onClick={clean}>Limpiar</button>
            <button className="btn" onClick={cargarPruebas}>Datos de prueba</button>
          </div>
        </header>

        <section className="card">
          <div className="grid">
            <label className="field">Obra / Frente
              <input value={obra} onChange={(e)=>setObra(e.target.value)} />
            </label>
            <label className="field">Responsable
              <input value={responsable} onChange={(e)=>setResponsable(e.target.value)} />
            </label>
            <label className="field">Fecha
              <input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="card print-hide">
          {!selectedTipo && (
            <div>
              <h3 className="section-title">1) Selecciona el TIPO de trabajo</h3>
              <div className="cards">
                {tipos.map((tp) => (
                  <button key={tp} className="card selectable" onClick={() => { setSelectedTipo(tp); setSelectedCategoria(null); }}>
                    <div className="muted">Tipo</div>
                    <div className="big">{tp}</div>
                    <div className="muted small">{categoriasPorTipo[tp].length} subcategorías</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTipo && !selectedCategoria && (
            <div>
              <div className="section-head">
                <h3 className="section-title">2) {selectedTipo} – elige una CATEGORÍA</h3>
                <button className="link" onClick={() => setSelectedTipo(null)}>← Volver a tipos</button>
              </div>
              <div className="cards">
                {categoriasPorTipo[selectedTipo].map((cat) => (
                  <button key={cat} className="card selectable" onClick={() => setSelectedCategoria(cat)}>
                    <div className="muted">Categoría</div>
                    <div className="big">{cat}</div>
                    <div className="muted small">{TARIFFS.filter(t=>t.tipo===selectedTipo && t.categoria===cat).length} actividades</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTipo && selectedCategoria && (
            <div>
              <div className="section-head">
                <h3 className="section-title">3) {selectedTipo} • {selectedCategoria} – elige una ACTIVIDAD</h3>
                <div className="gap">
                  <button className="link" onClick={() => setSelectedCategoria(null)}>← Cambiar categoría</button>
                  <button className="link" onClick={() => setSelectedTipo(null)}>← Cambiar tipo</button>
                </div>
              </div>
              <div className="cards">
                {actividadesVisibles.map((t) => (
                  <button key={t.id} className="card selectable" onClick={() => { setShowForm(t.id); setQty(1); setNota(""); }}>
                    <div className="muted">{t.tipo} • {t.categoria}</div>
                    <div className="big">{t.actividad}</div>
                    <div className="muted small">Unidad: <b>{t.unidad}</b></div>
                    <div className="price">{money(t.tarifa)}<span className="unit"> / {t.unidad.toLowerCase()}</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section ref={reportRef} className="paper">
          <div className="paper-head">
            <img src="/byb-logo.png" alt="BYB" style={{height:48}} />
            <div>
              <h2>Listado de trabajos</h2>
              <div className="muted">Registros {rows.length}</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha/Hora</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Actividad</th>
                  <th>Unidad</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Tarifa</th>
                  <th className="num">Total</th>
                  <th>Notas</th>
                  <th className="print-hide"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="empty">Sin registros. Usa el selector superior para añadir trabajos.</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.uid} className={r.tipo === "IMPORTACIÓN" ? "is-import" : undefined}>
                    <td>{new Date(r.fecha).toLocaleString()}</td>
                    <td>{r.tipo}</td>
                    <td>{r.categoria}</td>
                    <td>{r.actividad}</td>
                    <td>{r.unidad}</td>
                    <td className="num strong">{r.qty}</td>
                    <td className="num">{money(r.tarifa)}</td>
                    <td className="num strong">{money(r.subtotal)}</td>
                    <td className="truncate" title={r.nota}>{r.nota}</td>
                    <td className="print-hide"><button className="link danger" onClick={()=>removeRegistro(r.uid)}>Quitar</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7} className="num strong right">TOTAL GENERAL</td>
                  <td className="num strong">{money(totalGeneral)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="meta">
            <div><span className="muted up">Obra/Frente</span><div className="val">{obra}</div></div>
            <div><span className="muted up">Responsable</span><div className="val">{responsable || "—"}</div></div>
            <div><span className="muted up">Fecha</span><div className="val">{new Date(fecha + "T00:00:00").toLocaleDateString()}</div></div>
          </div>

          <div className="signatures">
            <div className="sign">
              <div className="sign-line"></div>
              <label>Elaborado por</label>
            </div>
            <div className="sign">
              <div className="sign-line"></div>
              <label>Revisado por</label>
            </div>
            <div className="sign">
              <div className="sign-line"></div>
              <label>Aprobado por</label>
            </div>
          </div>
        </section>
      </div>

      {showForm && (
        <div className="modal" onClick={()=>setShowForm(null)}>
          <div className="modal-card" onClick={(e)=>e.stopPropagation()}>
            {(() => {
              const t = TARIFFS.find((x) => x.id === showForm);
              if (!t) return null;
              return (
                <>
                  <h3 className="modal-title">Añadir trabajo</h3>
                  <p className="muted">{t.tipo} • {t.categoria} — <b>{t.actividad}</b> ({t.unidad}) · Tarifa: <b>{money(t.tarifa)}</b></p>
                  <label className="field">Cantidad ({t.unidad})
                    <input type="number" min={1} step={1} value={qty} onChange={(e)=>setQty(e.target.value)} />
                  </label>
                  <label className="field">Notas (opcional)
                    <textarea rows={3} value={nota} onChange={(e)=>setNota(e.target.value)} placeholder="Ej.: turno, placa, detalle del trabajo" />
                  </label>
                  <div className="actions end">
                    <button className="btn" onClick={()=>setShowForm(null)}>Cancelar</button>
                    <button className="btn dark" onClick={()=>{ addRegistro(showForm, qty, nota); setShowForm(null); }}>Añadir</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
