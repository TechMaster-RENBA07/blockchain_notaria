import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "./api";

const TYPES = [
  ["NOTARIAL_LETTER", "Carta notarial"],
  ["FACT_INSPECTION", "Constatación de hechos"],
  ["SWORN_STATEMENT", "Declaración jurada"],
  ["SIMPLE_POWER", "Poder simple"],
  ["AUTHORIZATION", "Autorización"],
  ["OTHER_EXTRA_PROTOCOLAR", "Otro acto extraprotocolar"],
];

const TYPE_LABEL = Object.fromEntries(TYPES);
const ROLE_LABEL = {
  ADMIN: "Administrador",
  NOTARY: "Notario",
  OPERATOR: "Operador",
  AUDITOR: "Auditor",
};
const formatDate = (value) => value ? new Date(value).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" }) : "—";
const formatSize = (value) => `${(value / 1024 / 1024).toFixed(2)} MB`;

function FingerprintSeal({ hash, size = 112 }) {
  const rays = [...hash.slice(0, 64)].map((digit, index) => {
    const value = Number.parseInt(digit, 16);
    const angle = (index / 64) * Math.PI * 2 - Math.PI / 2;
    const innerRadius = 21 + (value % 3);
    const outerRadius = 32 + value * 0.72;
    const x1 = 50 + Math.cos(angle) * innerRadius;
    const y1 = 50 + Math.sin(angle) * innerRadius;
    const x2 = 50 + Math.cos(angle) * outerRadius;
    const y2 = 50 + Math.sin(angle) * outerRadius;
    return { x1, y1, x2, y2, color: value > 12 ? "#d71920" : "#123c8c", width: value > 10 ? 1 : 0.65 };
  });
  return (
    <svg className="fingerprint-seal" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Sello visual determinista de la huella SHA-256">
      <circle cx="50" cy="50" r="47" fill="#fff" stroke="#d9e2ef" strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#123c8c" strokeOpacity=".22" strokeWidth=".6" />
      {rays.map((ray, index) => <line key={index} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} stroke={ray.color} strokeWidth={ray.width} strokeLinecap="round" />)}
      <circle cx="50" cy="50" r="19" fill="#fff" stroke="#123c8c" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="15.5" fill="none" stroke="#d71920" strokeOpacity=".7" strokeWidth=".7" />
      <path d="M50 39 59 44v7c0 6-4 10-9 13-5-3-9-7-9-13v-7z" fill="#123c8c" />
      <path d="M45 51v-7l10 12v-7" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function FingerprintPanel({ hash }) {
  const [copyMessage, setCopyMessage] = useState("");
  async function copyHash() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopyMessage("Huella copiada");
      window.setTimeout(() => setCopyMessage(""), 1800);
    } catch {
      setCopyMessage("No se pudo copiar la huella");
      window.setTimeout(() => setCopyMessage(""), 2500);
    }
  }
  function downloadSeal() {
    const svg = window.document.querySelector(".fingerprint-seal");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `sello-integridad-${hash.slice(0, 12)}.svg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="fingerprint-panel" aria-label="Sello visual de integridad">
      <FingerprintSeal hash={hash} size={104} />
      <div className="fingerprint-info">
        <span className="fingerprint-eyebrow">SELLO DE INTEGRIDAD</span>
        <b>Identidad visual de este archivo</b>
        <span className="fingerprint-caption">La misma huella siempre genera el mismo sello.</span>
        <code>{hash}</code>
        <div className="fingerprint-actions">
          <button type="button" onClick={copyHash}>Copiar huella</button>
          <button type="button" onClick={downloadSeal}>Descargar sello</button>
          {copyMessage && <span role="status">{copyMessage}</span>}
        </div>
      </div>
      <span className="fingerprint-watermark" aria-hidden="true">SHA<br />256</span>
    </section>
  );
}

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>;
}

function ErrorBox({ children }) {
  return children ? <div className="alert alert-error" role="alert">{children}</div> : null;
}

function StatusPill({ status }) {
  const labels = { ANCHORED: "Anclado en blockchain", PENDING: "Anclaje pendiente", FAILED: "Anclaje fallido" };
  return <span className={`status status-${String(status || "PENDING").toLowerCase()}`}>{labels[status] || status}</span>;
}

function useDocuments(authorized) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.documents();
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authorized]);
  useEffect(() => { refresh(); }, [refresh]);
  return { documents, loading, error, refresh };
}

function LoginPage({ onLogin, onRetryHealth, authError, healthError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onLogin(email, password);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-shell container-fluid">
      <section className="login-panel row w-100" aria-label="Iniciar sesión">
        <div className="login-card card col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">
          <Link className="login-brand-lockup" to="/login"><img className="brand-logo" src="/milton-guzman-notaria.png" alt="Sello de Milton Guzmán, abogado notario" /><span>MILTON <b>GUZMÁN</b></span></Link>
          <h1>Iniciar sesión</h1>
          <p className="login-subtitle">Accede a tu cuenta notarial.</p>
          <p className={`login-status${healthError ? " offline" : ""}`} role="status" aria-live="polite">
            <span className="online-dot" />{healthError ? "API desconectada" : "Sistema listo"}
            {healthError && <><span>· revisa servidor y base de datos</span><button className="login-retry" type="button" onClick={onRetryHealth}>Reintentar</button></>}
          </p>
          <form className="login-form d-grid gap-3" onSubmit={submit}>
            <label className="field"><span>Correo electrónico</span><input className="form-control" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@notaria.pe" /></label>
            <label className="field"><span>Contraseña</span><input className="form-control" type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" /></label>
            <ErrorBox>{authError}</ErrorBox>
            <button className="button button-primary btn btn-primary w-100 login-submit" type="submit" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
          </form>
          <p className="login-footer">Acceso privado para personal autorizado</p>
        </div>
      </section>
    </main>
  );
}

function AppLayout({ user, health, onLogout, children }) {
  const links = [
    ["/", "▦", "Principal", true],
    ...(["ADMIN", "NOTARY", "OPERATOR"].includes(user.role) ? [["/documentos/nuevo", "＋", "Registrar documento"]] : []),
    ["/comparar", "⇄", "Comparar archivos"],
    ["/documentos", "▤", "Documentos"],
    ["/historial", "◷", "Historial"],
    ...(user.role === "ADMIN" || user.role === "AUDITOR" ? [["/auditoria", "≡", "Auditoría"]] : []),
    ...(user.role === "ADMIN" ? [["/usuarios", "♙", "Usuarios"]] : []),
    ["/cuenta", "◉", "Mi cuenta"],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand-lockup" to="/"><img className="brand-logo" src="/milton-guzman-notaria.png" alt="Sello de Milton Guzmán, abogado notario" /><span>MILTON <b>GUZMÁN</b></span></Link>
        <div className="office-tag"><span className="online-dot" /> PERÚ <span>·</span> EXTRAPROTOCOLAR</div>
        <div className="nav-caption">GESTIÓN NOTARIAL</div>
        <nav className="side-nav">
          {links.map(([to, icon, label, end]) => (
            <NavLink key={to} end={end} to={to} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon>{icon}</Icon>{label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="user-card">
            <div className="avatar">{user.displayName?.slice(0, 1).toUpperCase()}</div>
            <div className="user-data"><b>{user.displayName}</b><span>{ROLE_LABEL[user.role] || user.role} · {user.email}</span></div>
            <button className="icon-button" title="Cerrar sesión" onClick={onLogout}>↪</button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div><span className="topbar-kicker">GESTIÓN DOCUMENTAL</span><b>Notaría Milton Guzmán</b></div>
          <div className="topbar-right"><span className="network-chip"><span className={`online-dot${health?.status === "ok" ? "" : " offline-dot"}`} />{health?.status === "ok" ? "Base de datos conectada" : "API sin conexión"}</span><span className="avatar">{user.displayName?.slice(0, 1).toUpperCase()}</span></div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div>{action}</div>;
}

function DocumentTable({
  documents,
  loading,
  onRetry,
  canRegister = true,
  canArchive = false,
  archived = false,
  onArchive,
  onRestore,
}) {
  if (loading) return <div className="empty-state">Cargando documentos…</div>;
  if (!documents.length) return <div className="empty-state"><div className="empty-icon">▤</div><h3>{archived ? "No hay expedientes archivados" : "Aún no hay documentos"}</h3><p>{archived ? "Los expedientes que archives aparecerán aquí y podrás restaurarlos." : canRegister ? "Registra el primer documento extraprotocolar para empezar." : "Todavía no hay expedientes para mostrar."}</p>{!archived && canRegister && <Link className="button button-primary" to="/documentos/nuevo">Registrar documento</Link>}</div>;
  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Expediente</th><th>Tipo de acto</th><th>Fecha de registro</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{documents.map((doc) => (
          <tr key={doc.id}>
            <td><Link className="table-main" to={`/documentos/${doc.id}`}>{doc.reference}</Link><span className="table-sub">{doc.originalName}</span><span className="document-version-count">{doc.revisions?.length || 1} versión(es)</span></td>
            <td><span className="document-type">{TYPE_LABEL[doc.type] || doc.type}</span></td>
            <td><span className="document-date">{formatDate(doc.createdAt)}</span></td>
            <td><StatusPill status={doc.chainStatus} /></td>
            <td><div className="document-row-actions">
              <Link className="document-icon-action" to={`/documentos/${doc.id}`} aria-label={`Abrir ${doc.reference}`} title="Abrir expediente">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
              </Link>
              {canArchive && !archived && <button className="document-icon-action archive-action" type="button" onClick={() => onArchive(doc)} aria-label={`Archivar ${doc.reference}`} title="Archivar expediente">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M6 7l1 13h10l1-13M9 7V4h6v3M10 11v5M14 11v5" /></svg>
              </button>}
              {canArchive && archived && <button className="document-icon-action restore-action" type="button" onClick={() => onRestore(doc)} aria-label={`Restaurar ${doc.reference}`} title="Restaurar expediente">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10V5m0 5h5M4.8 9A8 8 0 1 1 5 16" /></svg>
              </button>}
            </div></td>
          </tr>
        ))}</tbody>
      </table>
      {onRetry && <div className="table-footer"><span>{documents.length} expediente(s)</span></div>}
    </div>
  );
}

function Dashboard({ documents, loading, error, refresh, user, health }) {
  const anchored = documents.filter((doc) => doc.chainStatus === "ANCHORED").length;
  const pending = documents.filter((doc) => doc.chainStatus !== "ANCHORED").length;
  return (
    <>
      <PageTitle eyebrow="RESUMEN DE ACTIVIDAD" title={`Buenos días, ${user.displayName?.split(" ")[0] || "notaría"}`} description="Vista general de los expedientes extraprotocolarios registrados en tu espacio." action={<button className="button button-secondary" onClick={refresh}>↻ Actualizar</button>} />
      <ErrorBox>{error}</ErrorBox>
      <section className="integrity-hero">
        <div className="integrity-hero-copy"><p className="eyebrow">NOTARÍA MILTON GUZMÁN</p><h2>Gestión e integridad documental</h2><p>Registra documentos, consulta sus versiones y verifica sus huellas digitales.</p><div className="integrity-hero-actions"><Link className="button button-light" to="/comparar">Comparar documentos</Link>{user.role !== "AUDITOR" && <Link className="button button-hero-secondary" to="/documentos/nuevo">Registrar documento</Link>}</div></div>
        <div className="integrity-chain-card"><span className="integrity-chain-icon">◈</span><span className="integrity-chain-label">ESTADO DE RED</span><b>{health?.blockchain === "configured" ? "Red configurada" : "Anclaje no configurado"}</b><small>{health?.blockchain === "configured" ? "Los nuevos registros pueden enviar hashes al contrato." : "Se registra localmente; no se afirma un anclaje en cadena."}</small><span className={`chain-state${health?.blockchain === "configured" ? " chain-state-ready" : ""}`}><i />{health?.blockchain === "configured" ? "LISTA PARA VERIFICAR" : "PENDIENTE DE CONFIGURACIÓN"}</span></div>
      </section>
      <section className="metric-grid">
        <article className="metric-card"><div className="metric-icon purple">▤</div><span>Total expedientes</span><b>{loading ? "—" : documents.length}</b><small>Registrados por tu cuenta</small></article>
        <article className="metric-card"><div className="metric-icon green">✓</div><span>Huella anclada</span><b>{loading ? "—" : anchored}</b><small>Confirmada en blockchain</small></article>
        <article className="metric-card"><div className="metric-icon amber">◷</div><span>Por anclar</span><b>{loading ? "—" : pending}</b><small>Requieren configurar o reintentar la red</small></article>
        <article className="metric-card"><div className="metric-icon blue">⌕</div><span>Tipos disponibles</span><b>{TYPES.length}</b><small>Actos extraprotocolarios</small></article>
      </section>
      <section className="content-card">
        <div className="card-heading"><div><h2>Expedientes recientes</h2><p>Últimos registros de tu espacio</p></div><Link className="text-link" to="/documentos">Ver todos →</Link></div>
        <DocumentTable documents={documents.slice(0, 6)} loading={loading} canRegister={user.role !== "AUDITOR"} />
      </section>
    </>
  );
}

function RegisterDocument({ onRegistered }) {
  const navigate = useNavigate();
  const [type, setType] = useState(TYPES[0][0]);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError("Selecciona el archivo que se registrará.");
    setBusy(true);
    setError("");
    const form = new FormData();
    form.append("type", type);
    form.append("reference", reference);
    form.append("notes", notes);
    form.append("file", file);
    try {
      const result = await api.register(form);
      await onRegistered();
      navigate(`/documentos/${result.document.id}`, { state: { notice: result.blockchainMessage } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow="NUEVO EXPEDIENTE" title="Registrar documento" description="Asocia el tipo de actuación y una referencia interna. El contenido se cifra antes de almacenarse." />
      <div className="form-layout">
        <form className="content-card form-card" onSubmit={submit}>
          <ErrorBox>{error}</ErrorBox>
          <label className="field"><span>Tipo de acto extraprotocolar <i>*</i></span><select value={type} onChange={(event) => setType(event.target.value)}>{TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>Referencia interna <i>*</i></span><input required minLength={2} maxLength={80} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ej. CARTA-2026-0001" /><small>Evita incluir DNI, nombres de usuarios o información sensible; esta referencia se guarda en la base de datos.</small></label>
          <label className="field"><span>Nota de gestión (opcional)</span><textarea maxLength={500} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Información operativa no sensible" /></label>
          <label className="field"><span>Archivo a custodiar <i>*</i></span><input required type="file" accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} /><small>PDF, Word, Excel, TXT o imágenes PNG/JPG · máximo {import.meta.env.VITE_MAX_UPLOAD_MB || 20} MB. El original se cifra con AES-256-GCM en almacenamiento privado.</small></label>
          {file && <div className="file-preview"><span className="file-icon">PDF</span><div><b>{file.name}</b><small>{formatSize(file.size)} · {file.type || "tipo detectado por extensión"}</small></div></div>}
          <div className="form-actions"><Link className="button button-secondary" to="/documentos">Cancelar</Link><button disabled={busy} className="button button-primary">{busy ? "Guardando expediente…" : "Guardar y registrar huella →"}</button></div>
        </form>
        <aside className="side-note">
          <div className="note-heading"><span>◈</span><b>Qué queda registrado</b></div>
          <ul><li>Huella criptográfica del archivo completo.</li><li>Identificador de consulta aleatorio.</li><li>Fecha de registro y usuario operador.</li><li>Transacción blockchain, si la red está configurada y confirma el anclaje.</li></ul>
        </aside>
      </div>
    </>
  );
}

function DocumentsPage({ documents, loading, error, refresh, user }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [archivedDocuments, setArchivedDocuments] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const isAdmin = user.role === "ADMIN";
  const refreshArchived = useCallback(async () => {
    if (!isAdmin) return;
    setArchivedLoading(true);
    setArchiveError("");
    try {
      const result = await api.documents(true);
      setArchivedDocuments(result.documents);
    } catch (err) {
      setArchiveError(err.message);
    } finally {
      setArchivedLoading(false);
    }
  }, [isAdmin]);
  useEffect(() => {
    if (showArchived) refreshArchived();
  }, [showArchived, refreshArchived]);
  const sourceDocuments = showArchived ? archivedDocuments : documents;
  const filtered = sourceDocuments.filter((doc) => `${doc.reference} ${TYPE_LABEL[doc.type] || doc.type} ${doc.originalName}`.toLowerCase().includes(query.toLowerCase()));

  async function archiveDocument(document) {
    if (!window.confirm(`¿Archivar el expediente “${document.reference}”? Podrás restaurarlo después; sus archivos y auditoría se conservarán.`)) return;
    setArchiveError("");
    try {
      await api.archiveDocument(document.id);
      await refresh();
    } catch (err) {
      setArchiveError(err.message);
    }
  }

  async function restoreDocument(document) {
    setArchiveError("");
    try {
      await api.restoreDocument(document.id);
      await refreshArchived();
      await refresh();
    } catch (err) {
      setArchiveError(err.message);
    }
  }

  return (
    <>
      <PageTitle eyebrow="ARCHIVO PRIVADO" title="Documentos" description="Consulta tus expedientes y abre su registro de integridad." action={user.role !== "AUDITOR" && <Link className="button button-primary" to="/documentos/nuevo">＋ Nuevo registro</Link>} />
      <ErrorBox>{error || archiveError}</ErrorBox>
      <section className="content-card">
        <div className="documents-toolbar">
          <div className="documents-view-switch" role="tablist" aria-label="Tipo de expediente">
            <button type="button" role="tab" aria-selected={!showArchived} className={!showArchived ? "active" : ""} onClick={() => setShowArchived(false)}>Activos <span>{documents.length}</span></button>
            {isAdmin && <button type="button" role="tab" aria-selected={showArchived} className={showArchived ? "active" : ""} onClick={() => setShowArchived(true)}>Archivados <span>{archivedDocuments.length}</span></button>}
          </div>
          <label className="document-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4 4" /></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar expediente" /></label>
        </div>
        <div className="documents-summary"><div><h2>{showArchived ? "Expedientes archivados" : "Expedientes"}</h2><p>{filtered.length} {filtered.length === 1 ? "registro" : "registros"}</p></div></div>
        <DocumentTable documents={filtered} loading={showArchived ? archivedLoading : loading} onRetry={showArchived ? refreshArchived : refresh} canRegister={user.role !== "AUDITOR"} canArchive={isAdmin} archived={showArchived} onArchive={archiveDocument} onRestore={restoreDocument} />
      </section>
    </>
  );
}

function DocumentComparisonPage({ documents, loading }) {
  const [selections, setSelections] = useState(["", ""]);
  const [uploads, setUploads] = useState([null, null]);
  const [comparedFiles, setComparedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([null, null]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageOpacity, setImageOpacity] = useState(55);

  useEffect(() => {
    const urls = comparedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
  }, [comparedFiles]);

  function updateSelection(index, value) {
    setSelections((current) => current.map((item, position) => position === index ? value : item));
    setUploads((current) => current.map((item, position) => position === index ? null : item));
    setResult(null);
    setComparedFiles([]);
    setError("");
  }

  function chooseFile(index, file) {
    setUploads((current) => current.map((item, position) => position === index ? file : item));
    setResult(null);
    setComparedFiles([]);
    setError("");
  }

  async function compare(event) {
    event.preventDefault();
    const optionLists = documents.flatMap((document) => (document.revisions || [])
      .filter((revision) => revision.hasFile)
      .map((revision) => ({ document, revision, value: `${document.id}:${revision.version}` })));
    const selected = selections.map((value) => optionLists.find((option) => option.value === value));
    if (uploads.some((file, index) => !file && !selected[index])) {
      setError("Selecciona dos versiones o carga un archivo en cada lado.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const files = await Promise.all(uploads.map(async (file, index) => {
        if (file) return file;
        const { document, revision } = selected[index];
        const blob = await api.downloadRevision(document.id, revision.version);
        return new File([blob], revision.originalName, { type: blob.type });
      }));
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      const comparison = await api.compare(form);
      setComparedFiles(files);
      setResult(comparison);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function renderPreview(file, url) {
    if (!file || !url) return <div className="comparison-preview-empty">Selecciona un documento para previsualizarlo.</div>;
    const extension = file.name.split(".").pop().toLowerCase();
    if (extension === "pdf") return <iframe className="comparison-pdf" title={`Vista previa de ${file.name}`} src={url} />;
    if (["png", "jpg", "jpeg"].includes(extension)) return <img className="comparison-image" src={url} alt={`Vista previa de ${file.name}`} />;
    if (extension === "txt") return <iframe className="comparison-text-frame" title={`Vista previa de ${file.name}`} src={url} />;
    return <div className="comparison-preview-empty"><b>Vista comparativa de contenido</b><span>El contenido extraído se mostrará con las diferencias al comparar.</span></div>;
  }

  const diff = result?.comparison?.diff;
  const leftLines = [];
  const rightLines = [];
  for (const chunk of diff?.chunks || []) {
    for (const line of chunk.lines) {
      const item = { text: line || " ", type: chunk.type };
      if (chunk.type === "removed") {
        leftLines.push(item);
        rightLines.push({ text: " ", type: "empty" });
      } else if (chunk.type === "added") {
        leftLines.push({ text: " ", type: "empty" });
        rightLines.push(item);
      } else {
        leftLines.push(item);
        rightLines.push(item);
      }
    }
  }

  return (
    <>
      <div className="page-title comparison-title"><h1>Comparar documentos</h1></div>
      <form className="content-card comparison-form" onSubmit={compare}>
        <div className="comparison-file-fields">
          {[0, 1].map((index) => (
            <div className="field comparison-source" key={index}>
              <span>{index === 0 ? "Original" : "Comparar con"}</span>
              <select value={selections[index]} onChange={(event) => updateSelection(index, event.target.value)} disabled={loading}>
                <option value="">{loading ? "Cargando expedientes…" : "Elegir versión registrada"}</option>
                {documents.flatMap((document) => (document.revisions || [])
                  .filter((revision) => revision.hasFile)
                  .map((revision) => <option key={`${document.id}:${revision.version}`} value={`${document.id}:${revision.version}`}>
                    {document.reference} · v{revision.version} · {revision.originalName}
                  </option>))}
              </select>
              <label className="comparison-upload">O cargar archivo
                <input type="file" accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg" onChange={(event) => chooseFile(index, event.target.files?.[0] || null)} />
              </label>
              {uploads[index] && <span className="comparison-file-meta">{uploads[index].name}</span>}
            </div>
          ))}
        </div>
        <ErrorBox>{error}</ErrorBox>
        <button className="button button-primary" disabled={busy || uploads.some((file, index) => !file && !selections[index])}>{busy ? "Comparando…" : "Comparar"}</button>
      </form>

      {result && <>
        <section className="content-card comparison-result">
          <div className={`comparison-verdict ${result.exactMatch ? "matched" : "mismatched"}`} role="status">
            <div className="comparison-verdict-mark">{result.exactMatch ? "✓" : "≠"}</div>
            <b>{result.exactMatch ? "Idénticos" : "Diferentes"}</b>
          </div>
          <div className="comparison-hashes">
            {result.files.map((file, index) => <div className="comparison-hash" key={index}><span>{index === 0 ? "Original" : "Comparación"} · {file.name}</span><code>{file.hash}</code></div>)}
          </div>
        </section>
        {comparedFiles.every((file) => ["png", "jpg", "jpeg"].includes(file.name.split(".").pop().toLowerCase())) && <section className="content-card">
          <div className="card-heading"><h2>Diferencia visual</h2><label className="image-opacity-control">Opacidad <input type="range" min="10" max="100" value={imageOpacity} onChange={(event) => setImageOpacity(Number(event.target.value))} /></label></div>
          <div className="image-diff-stage"><img src={previewUrls[0]} alt="Imagen original" /><img src={previewUrls[1]} alt="Diferencia visual" style={{ opacity: imageOpacity / 100 }} /></div>
        </section>}

        <section className="content-card">
          <div className="comparison-previews">
            {comparedFiles.map((file, index) => <article className="comparison-preview" key={index}><h3>{index === 0 ? "Original" : "Comparación"} · {file.name}</h3>{renderPreview(file, previewUrls[index])}</article>)}
          </div>
        </section>

        <section className="content-card comparison-diff-card">
          <div className="card-heading"><h2>Diferencias</h2></div>
          {diff?.available ? diff.addedLines === 0 && diff.removedLines === 0
            ? <div className="comparison-no-text-change">El texto coincide.</div>
            : <div className="comparison-diff">
              <div className="comparison-diff-column"><h3>Original <span>{diff.removedLines} línea(s) removida(s)</span></h3>{leftLines.map((line, index) => <pre className={`diff-line diff-${line.type}`} key={index}>{line.text}</pre>)}</div>
              <div className="comparison-diff-column"><h3>Comparación <span>{diff.addedLines} línea(s) agregada(s)</span></h3>{rightLines.map((line, index) => <pre className={`diff-line diff-${line.type}`} key={index}>{line.text}</pre>)}</div>
            </div>
            : <div className="comparison-no-text-change">{diff?.reason || "No hay texto comparable."}</div>}
        </section>
      </>}
    </>
  );
}

function DocumentDetail({ user }) {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verification, setVerification] = useState(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.document(id);
      setDocument(result.document);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <div className="empty-state">Cargando expediente…</div>;
  if (error && !document) return <ErrorBox>{error}</ErrorBox>;
  if (!document) return null;

  async function submitFile(endpoint) {
    if (!file) return setError("Selecciona un archivo primero.");
    setBusy(true);
    setError("");
    setNotice("");
    const form = new FormData();
    form.append("file", file);
    try {
      const result = endpoint === "verify" ? await api.verify(id, form) : await api.revise(id, form);
      if (endpoint === "verify") setVerification(result);
      else {
        setNotice(result.blockchainMessage);
        setFile(null);
        await load();
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function download(kind) {
    setError("");
    try {
      const blob = kind === "file"
        ? await api.downloadFile(id)
        : kind === "qr-copy"
          ? await api.downloadFileWithQr(id)
          : kind === "qr-png"
            ? await api.downloadQrPng(id)
            : kind === "qr-pdf"
              ? await api.downloadQrPdf(id)
          : await api.downloadCertificate(id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      const sourceExtension = document.originalName.split(".").pop().toLowerCase();
      const qrExtension = ["pdf", "docx", "xlsx", "png", "jpg", "jpeg"].includes(sourceExtension)
        ? sourceExtension
        : "pdf";
      link.download = kind === "file"
        ? document.originalName
        : kind === "qr-copy"
          ? `nexo-notarial-verificado-${document.publicId}.${qrExtension}`
          : kind === "qr-png"
            ? `qr-${document.publicId}.png`
            : kind === "qr-pdf"
              ? `qr-${document.publicId}.pdf`
              : `constancia-${document.publicId}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err.message); }
  }

  async function downloadRevision(revision) {
    setError("");
    try {
      const blob = await api.downloadRevision(id, revision.version);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = revision.originalName || `version-${revision.version}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  }

  async function retryAnchor() {
    setBusy(true); setError("");
    try { const result = await api.anchor(id); setNotice(`Anclaje confirmado: ${result.transactionHash}`); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const owns = document.createdBy?.email === user.email;
  return (
    <>
      <PageTitle eyebrow={`EXPEDIENTE ${document.id.slice(0, 8).toUpperCase()}`} title={document.reference} description={TYPE_LABEL[document.type] || document.type} action={<Link className="button button-secondary" to="/documentos">← Documentos</Link>} />
      <ErrorBox>{error}</ErrorBox>
      {notice && <div className="alert alert-success">{notice}</div>}
      <div className="detail-grid">
        <section className="content-card detail-main">
          <div className="card-heading"><div><h2>Integridad del documento</h2><p>Versiones y anclajes registrados</p></div><StatusPill status={document.chainStatus} /></div>
          <div className="detail-properties">
            <div><span>Referencia</span><b>{document.reference}</b></div>
            <div><span>Tipo de acto</span><b>{TYPE_LABEL[document.type]}</b></div>
            <div><span>Fecha de alta</span><b>{formatDate(document.createdAt)}</b></div>
            <div><span>Tamaño del original</span><b>{formatSize(document.sizeBytes)}</b></div>
            <div className="hash-field"><span>SHA-256 actual</span><code>{document.currentHash}</code></div>
            {document.transactionHash && <div className="hash-field"><span>Transacción</span><code>{document.transactionHash}</code></div>}
          </div>
          <FingerprintPanel hash={document.currentHash} />
          {document.chainStatus !== "ANCHORED" && (user.role === "ADMIN" || user.role === "NOTARY") && <button disabled={busy} className="button button-secondary" onClick={retryAnchor}>Reintentar anclaje blockchain</button>}
          <div className="revision-list"><h3>Versiones</h3>{document.revisions.map((revision) => <div className="revision-row" key={revision.id}><div className="version-badge">v{revision.version}</div><div className="revision-meta"><b>{revision.status === "REGISTERED" ? "Registrada" : revision.status}</b><span>{formatDate(revision.createdAt)}</span></div><code>{revision.fileHash}</code><StatusPill status={revision.transactionHash ? "ANCHORED" : "PENDING"} />{revision.hasFile && <button type="button" className="table-action" onClick={() => downloadRevision(revision)}>Descargar</button>}</div>)}</div>
          <div className="action-row"><button className="button button-secondary" onClick={() => download("file")}>Original</button><button className="button button-primary" disabled={busy} onClick={() => download("qr-copy")}>Copia con QR</button><button className="button button-secondary" onClick={() => download("qr-png")}>QR PNG</button><button className="button button-secondary" onClick={() => download("qr-pdf")}>QR PDF</button><Link className="button button-secondary" to={`/certificados/${document.id}`}>Constancia</Link></div>
        </section>
        <aside className="content-card detail-side">
          <h3>Verificar un archivo</h3><p>Compara una copia con la huella actual de este expediente.</p>
          <input type="file" accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg" onChange={(event) => { setFile(event.target.files?.[0] || null); setVerification(null); }} />
          <button className="button button-primary full-width" disabled={!file || busy} onClick={() => submitFile("verify")}>{busy ? "Procesando…" : "Verificar integridad"}</button>
          {verification && <div className={`verification-result ${verification.match ? "matched" : "mismatched"}`}><b>{verification.match ? "Huella coincidente" : "No coincide"}</b><p>{verification.message}</p><small>Base de datos: {verification.databaseMatch ? "coincide" : "no coincide"} · Blockchain: {verification.chainMatch === null ? "sin confirmar" : verification.chainMatch ? "coincide" : "no coincide"}</small></div>}
          {owns && <div className="revision-upload"><h3>Registrar nueva versión</h3><p>La nueva versión se cifra y conserva junto con sus metadatos; las versiones anteriores se mantienen en el expediente.</p><button disabled={!file || busy} className="button button-secondary full-width" onClick={() => submitFile("revise")}>Guardar nueva versión</button></div>}
        </aside>
      </div>
    </>
  );
}

function HistoryPage({ documents, loading }) {
  return (
    <>
      <PageTitle eyebrow="TRAZABILIDAD" title="Historial" description="Historial por expediente con hashes, fechas y estado de anclaje." />
      <section className="content-card"><div className="card-heading"><div><h2>Selecciona un expediente</h2><p>El detalle muestra cada versión almacenada en blockchain y base de datos.</p></div></div><DocumentTable documents={documents} loading={loading} /></section>
    </>
  );
}

function CertificatePage() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.document(id).then((result) => setDocument(result.document)).catch((err) => setError(err.message)); }, [id]);
  const verificationUrl = document ? `${window.location.origin}/verificar/${document.publicId}` : "";
  async function download() {
    try {
      const blob = await api.downloadCertificate(id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `constancia-${document.publicId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  }
  async function downloadQr(format) {
    try {
      const blob = format === "pdf" ? await api.downloadQrPdf(id) : await api.downloadQrPng(id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `qr-${document.publicId}.${format}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <PageTitle eyebrow="CONSTANCIA DE REGISTRO" title="Certificado de integridad" description="La constancia resume la huella del archivo y permite consultar el registro técnico." />
      <ErrorBox>{error}</ErrorBox>
      {document && <article className="certificate-sheet">
        <div className="certificate-top"><img className="certificate-mark" src="/milton-guzman-notaria.png" alt="Sello de Milton Guzmán, abogado notario" /><p>MILTON GUZMÁN · ABOGADO NOTARIO</p><h2>Constancia técnica de integridad</h2><span className="certificate-rule" /></div>
        <p className="certificate-intro">Se deja constancia únicamente de la existencia de un registro técnico de huella digital para el archivo identificado a continuación.</p>
        <div className="certificate-fields">
          <div><span>Referencia interna</span><b>{document.reference}</b></div>
          <div><span>Tipo de acto</span><b>{TYPE_LABEL[document.type]}</b></div>
          <div><span>Fecha de registro</span><b>{formatDate(document.createdAt)}</b></div>
          <div><span>Estado blockchain</span><StatusPill status={document.chainStatus} /></div>
          <div className="hash-field"><span>Huella SHA-256</span><code>{document.currentHash}</code></div>
          <div className="hash-field"><span>Identificador público</span><code>{document.publicId}</code></div>
          {document.transactionHash && <div className="hash-field"><span>Transacción blockchain</span><code>{document.transactionHash}</code></div>}
        </div>
        <div className="certificate-verify"><div><h3>Verificación pública</h3><p>Escanea el código para consultar el estado de integridad.</p><a href={verificationUrl}>{verificationUrl}</a></div><QRCodeSVG value={verificationUrl} size={132} level="H" includeMargin fgColor="#123c8c" bgColor="transparent" /></div>
        <div className="certificate-disclaimer"><b>Importante</b><p>Esta constancia permite revisar la integridad del archivo. No reemplaza la actuación ni las formalidades notariales.</p></div>
        <div className="certificate-actions"><Link className="button button-secondary" to={`/documentos/${id}`}>← Volver al expediente</Link><div className="certificate-action-buttons"><button className="button button-secondary" onClick={() => downloadQr("png")}>Descargar QR PNG</button><button className="button button-secondary" onClick={() => downloadQr("pdf")}>Descargar QR PDF</button><button className="button button-secondary" onClick={() => window.print()}>Imprimir constancia</button><button className="button button-primary" onClick={download}>Descargar PDF con QR</button></div></div>
      </article>}
    </>
  );
}

function AccountPage({ user, health }) {
  return (
    <>
      <PageTitle eyebrow="PERFIL INSTITUCIONAL" title="Mi cuenta" description="Identidad autorizada y estado de configuración del espacio." />
      <section className="content-card account-card"><div className="avatar large">{user.displayName?.slice(0, 1).toUpperCase()}</div><h2>{user.displayName}</h2><p>{user.email}</p><div className="account-grid"><div><span>Rol</span><b>{ROLE_LABEL[user.role] || user.role}</b></div><div><span>Base de datos</span><b>{health?.database || "Consultando…"}</b></div><div><span>Acceso</span><b>Correo y contraseña</b></div><div><span>Blockchain</span><b>{health?.blockchain || "Consultando…"}</b></div></div><p className="muted">Los permisos efectivos los aplica la API.</p></section>
    </>
  );
}

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("OPERATOR");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.users();
      setUsers(result.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.createUser({ displayName, email, password, role });
      setDisplayName("");
      setEmail("");
      setPassword("");
      setRole("OPERATOR");
      setNotice("La cuenta se creó correctamente. Comparte la contraseña inicial de forma segura.");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow="ADMINISTRACIÓN" title="Usuarios" description="Crea cuentas internas y asigna el rol según las responsabilidades del personal." />
      <ErrorBox>{error}</ErrorBox>
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      <div className="user-management-grid">
        <form className="content-card form-card" onSubmit={submit}>
          <div><h2>Registrar usuario</h2><p className="muted">El usuario iniciará sesión con su correo y la contraseña que definas.</p></div>
          <label className="field"><span>Nombre completo</span><input required minLength={2} maxLength={100} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <label className="field"><span>Correo electrónico</span><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className="field"><span>Contraseña inicial</span><input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><small>Mínimo 12 caracteres. Entrégala al usuario por un canal seguro.</small></label>
          <label className="field"><span>Rol del usuario</span><select value={role} onChange={(event) => setRole(event.target.value)}>{Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="role-descriptions">
            <p><b>Administrador:</b> administra usuarios y accede a todas las funciones.</p>
            <p><b>Notario:</b> registra documentos y gestiona sus anclajes.</p>
            <p><b>Operador:</b> registra documentos y administra los expedientes propios.</p>
            <p><b>Auditor:</b> consulta expedientes y la bitácora de auditoría.</p>
          </div>
          <button className="button button-primary" disabled={busy}>{busy ? "Creando cuenta…" : "Registrar usuario"}</button>
        </form>
        <section className="content-card">
          <div className="card-heading"><div><h2>Cuentas del sistema</h2><p>Solo administradores pueden registrar nuevos usuarios.</p></div></div>
          {loading ? <div className="empty-state">Cargando usuarios…</div> : users.length ? (
            <div className="table-scroll"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead><tbody>{users.map((account) => <tr key={account.id}><td><span className="table-main">{account.displayName}</span><span className="table-sub">{account.email}</span></td><td>{ROLE_LABEL[account.role] || account.role}</td><td>{account.enabled ? "Activo" : "Deshabilitado"}</td></tr>)}</tbody></table></div>
          ) : <div className="empty-state">No hay usuarios para mostrar.</div>}
        </section>
      </div>
    </>
  );
}

function AuditPage() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { api.audit().then((data) => setEvents(data.events)).catch((err) => setError(err.message)); }, []);
  return <><PageTitle eyebrow="CONTROL INTERNO" title="Auditoría" description="Eventos de autenticación, custodia, verificación y anclaje." /><ErrorBox>{error}</ErrorBox><section className="content-card"><div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Evento</th><th>Operador</th><th>Expediente</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{formatDate(event.createdAt)}</td><td>{event.action}</td><td>{event.user?.email || "—"}</td><td>{event.document?.reference || "—"}</td></tr>)}</tbody></table></div></section></>;
}

function PublicVerifyPage() {
  const { publicId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.publicVerify(publicId).then(setResult).catch((err) => setError(err.message)); }, [publicId]);
  return <div className="public-verify"><Link className="brand-lockup" to="/login"><img className="brand-logo" src="/milton-guzman-notaria.png" alt="Sello de Milton Guzmán, abogado notario" /><span>MILTON <b>GUZMÁN</b></span></Link><section className="content-card"><p className="eyebrow">CONSULTA PÚBLICA</p><h1>Verificación de integridad</h1><ErrorBox>{error}</ErrorBox>{!result && !error && <p>Consultando registro…</p>}{result && <><div className={`verification-result ${result.integrityConfirmed ? "matched" : "mismatched"}`}><b>{result.integrityConfirmed === true ? "Huella confirmada en blockchain" : result.integrityConfirmed === false ? "La huella en cadena no coincide con el registro" : "Registro localizado; confirmación de cadena no disponible"}</b><p>{TYPE_LABEL[result.documentType] || result.documentType}</p></div><dl className="public-data"><dt>Estado blockchain</dt><dd>{result.chainStatus}</dd><dt>Fecha de alta</dt><dd>{formatDate(result.registeredAt)}</dd><dt>Chain ID</dt><dd>{result.chainId || "—"}</dd><dt>Transacción</dt><dd>{result.transactionHash || "No disponible"}</dd>{result.hash && <><dt>Hash confirmado</dt><dd className="break-hash">{result.hash}</dd></>}</dl><div className="legal-note">{result.disclaimer}</div></>}</section></div>;
}

function NotificationsPage({ documents }) {
  const pending = documents.filter((document) => document.chainStatus !== "ANCHORED");
  return <><PageTitle eyebrow="CENTRO DE AVISOS" title="Notificaciones" description="Registros pendientes de publicar o confirmar en blockchain." /><section className="content-card">{pending.length ? pending.map((doc) => <div className="notification-row" key={doc.id}><span className="metric-icon amber">◷</span><div><b>{doc.reference}</b><p>{TYPE_LABEL[doc.type]} · {doc.chainStatus === "FAILED" ? "Anclaje fallido" : "La blockchain no está configurada o falta confirmar la transacción."}</p></div><Link className="table-action" to={`/documentos/${doc.id}`}>Revisar →</Link></div>) : <div className="empty-state"><h3>Todo al día</h3><p>No hay anclajes pendientes.</p></div>}</section></>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");
  const refreshDocuments = useDocuments(Boolean(user));
  const navigate = useNavigate();
  const checkHealth = useCallback(async () => {
    try {
      const result = await api.health();
      setHealth(result);
      setHealthError("");
    } catch (error) {
      setHealth(null);
      setHealthError(error.message);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api.me().then((result) => setUser(result.user)).catch(() => setUser(null)),
      checkHealth(),
    ]).finally(() => setAuthLoading(false));
  }, [checkHealth]);

  const login = useCallback(async (email, password) => {
    setAuthError("");
    try {
      const result = await api.login(email, password);
      setUser(result.user);
      navigate("/");
    } catch (error) {
      setAuthError(error.message);
    }
  }, [navigate]);

  async function logout() {
    try { await api.logout(); } catch (error) { setAuthError(error.message); }
    setUser(null);
    navigate("/login");
  }

  if (authLoading) return <div className="loading-screen">Nexo Notarial <span className="spinner" /></div>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={login} onRetryHealth={checkHealth} authError={authError} healthError={healthError} />} />
      <Route path="/verificar/:publicId" element={<PublicVerifyPage />} />
      <Route path="/*" element={user ? <AuthenticatedApp user={user} logout={logout} health={health} healthError={healthError} authError={authError} data={refreshDocuments} /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

function AuthenticatedApp({ user, logout, health, healthError, data, authError }) {
  return <AppLayout user={user} health={health} onLogout={logout}><ErrorBox>{authError || healthError}</ErrorBox><Routes><Route index element={<Dashboard {...data} user={user} health={health} />} /><Route path="comparar" element={<DocumentComparisonPage documents={data.documents} loading={data.loading} />} /><Route path="documentos" element={<DocumentsPage {...data} user={user} />} /><Route path="documentos/nuevo" element={["ADMIN", "NOTARY", "OPERATOR"].includes(user.role) ? <RegisterDocument onRegistered={data.refresh} /> : <Navigate to="/" replace />} /><Route path="documentos/:id" element={<DocumentDetail user={user} />} /><Route path="certificados/:id" element={<CertificatePage />} /><Route path="historial" element={<HistoryPage documents={data.documents} loading={data.loading} />} /><Route path="notificaciones" element={<NotificationsPage documents={data.documents} />} /><Route path="cuenta" element={<AccountPage user={user} health={health} />} /><Route path="usuarios" element={user.role === "ADMIN" ? <UsersPage /> : <Navigate to="/" replace />} /><Route path="auditoria" element={user.role === "ADMIN" || user.role === "AUDITOR" ? <AuditPage /> : <Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppLayout>;
}
