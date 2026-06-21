import { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Eye, Save, Download, Copy, Clock, X, Plus,
  CheckCircle2, History, Edit3, Trash2, Loader2, Send
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../lib/api-client";

interface VersionEntry {
  version: string;
  date: string;
  changes: string;
  author: string;
}

interface Template {
  id: string;           // UUID for CLO-created; slug for built-ins
  apiId?: number;       // numeric DB id once persisted
  name: string;
  desc: string;
  category: "placement" | "evaluation" | "admin";
  hasLetterhead: boolean;
  hasSignature: boolean;
  lastModified: string;
  version: string;
  placeholders: string[];
  status: "Active" | "Draft";
  visibleTo: string[];
  body?: string;
  signatureUrl?: string;
  versionHistory: VersionEntry[];
  isBuiltIn: boolean;   // built-in templates cannot be deleted
}

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: "placement-letter", name: "Placement Letter Template",
    desc: "Official university placement letter with letterhead and authorized signatures",
    category: "placement", hasLetterhead: true, hasSignature: true,
    lastModified: "2026-04-10", version: "3.2", status: "Active",
    placeholders: ["[Student Name]", "[Student ID]", "[Company Name]", "[Start Date]", "[End Date]", "[Department]", "[Supervisor Name]"],
    visibleTo: ["CLO", "DLO", "Student"],
    body: "To: The Manager,\n[Company Name]\n\nDear Sir/Madam,\n\nWe write to introduce [Student Name] (ID: [Student ID]), a student of the Department of [Department], Ho Technical University, who has been assigned to your esteemed organization for Industrial Attachment from [Start Date] to [End Date].\n\nWe kindly request that you provide the necessary support and supervision for the student during this period. An Industry Supervisor ([Supervisor Name]) will be designated to oversee the student's progress.\n\nThank you for your cooperation.",
    versionHistory: [
      { version: "3.2", date: "2026-04-10", changes: "Updated letterhead format and added QR verification code", author: "Dr. Asante" },
      { version: "3.1", date: "2026-03-01", changes: "Added supervisor name placeholder", author: "Dr. Asante" },
      { version: "3.0", date: "2026-01-15", changes: "Major redesign with new university branding", author: "System" },
    ],
    isBuiltIn: true,
  },
  {
    id: "acceptance-form", name: "Company Acceptance Form",
    desc: "PDF form for company signature, supervisor designation, and workplace details",
    category: "placement", hasLetterhead: false, hasSignature: false,
    lastModified: "2026-03-28", version: "2.1", status: "Active",
    placeholders: ["[Student Name]", "[Company Name]", "[Supervisor Name]", "[Supervisor Email]", "[Department]", "[Position]"],
    visibleTo: ["CLO", "DLO", "Student"],
    versionHistory: [{ version: "2.1", date: "2026-03-28", changes: "Added supervisor email field", author: "System" }],
    isBuiltIn: true,
  },
  {
    id: "midterm-evaluation", name: "Mid-Term Evaluation Form",
    desc: "Digital evaluation form for industry supervisors to assess student progress at midpoint",
    category: "evaluation", hasLetterhead: false, hasSignature: false,
    lastModified: "2026-03-15", version: "2.0", status: "Active",
    placeholders: ["[Student Name]", "[Company Name]", "[Evaluation Period]", "[Supervisor Name]"],
    visibleTo: ["Academic Supervisor", "Industry Supervisor", "DLO"],
    versionHistory: [{ version: "2.0", date: "2026-03-15", changes: "Revised scoring rubric", author: "System" }],
    isBuiltIn: true,
  },
  {
    id: "final-evaluation", name: "Final Evaluation Form",
    desc: "Comprehensive final assessment with rating scales, competency evaluation, and supervisor recommendations",
    category: "evaluation", hasLetterhead: false, hasSignature: false,
    lastModified: "2026-03-15", version: "2.3", status: "Active",
    placeholders: ["[Student Name]", "[Company Name]", "[Overall Grade]", "[Supervisor Name]", "[Completion Date]"],
    visibleTo: ["Academic Supervisor", "Industry Supervisor", "DLO"],
    versionHistory: [{ version: "2.3", date: "2026-03-15", changes: "Added competency grid", author: "System" }],
    isBuiltIn: true,
  },
  {
    id: "logbook-template", name: "Logbook Template",
    desc: "Daily logbook entry template with structured fields for activities, skills, and challenges",
    category: "admin", hasLetterhead: false, hasSignature: false,
    lastModified: "2026-02-20", version: "1.5", status: "Active",
    placeholders: ["[Student Name]", "[Date]", "[Company Name]", "[Activities]", "[Skills Learned]", "[Challenges]"],
    visibleTo: ["CLO", "DLO"],
    versionHistory: [{ version: "1.5", date: "2026-02-20", changes: "Added challenges section", author: "System" }],
    isBuiltIn: true,
  },
  {
    id: "completion-certificate", name: "Completion Certificate",
    desc: "Certificate of successful completion of the industrial attachment program",
    category: "placement", hasLetterhead: true, hasSignature: true,
    lastModified: "2026-01-10", version: "1.0", status: "Draft",
    placeholders: ["[Student Name]", "[Student ID]", "[Company Name]", "[Start Date]", "[End Date]", "[Grade]", "[Department]"],
    visibleTo: ["CLO", "DLO", "Student"],
    versionHistory: [{ version: "1.0", date: "2026-01-10", changes: "Initial version", author: "System" }],
    isBuiltIn: true,
  },
  {
    id: "site-visit-report", name: "Site Visit Report",
    desc: "Academic supervisor site visit report template with observation and recommendation fields",
    category: "evaluation", hasLetterhead: false, hasSignature: true,
    lastModified: "2026-03-20", version: "1.2", status: "Active",
    placeholders: ["[Student Name]", "[Company Name]", "[Visit Date]", "[Supervisor Name]", "[Observations]"],
    visibleTo: ["Academic Supervisor", "Industry Supervisor", "DLO"],
    versionHistory: [{ version: "1.2", date: "2026-03-20", changes: "Added recommendations field", author: "System" }],
    isBuiltIn: true,
  },
  {
    id: "introduction-letter", name: "Introduction Letter",
    desc: "Letter of introduction for students to present at their placement company",
    category: "placement", hasLetterhead: true, hasSignature: true,
    lastModified: "2026-04-01", version: "2.0", status: "Active",
    placeholders: ["[Student Name]", "[Student ID]", "[Company Name]", "[Department]", "[Level]", "[Contact Person]"],
    visibleTo: ["CLO", "DLO", "Student"],
    versionHistory: [{ version: "2.0", date: "2026-04-01", changes: "New university branding applied", author: "System" }],
    isBuiltIn: true,
  },
];

function mergeApiTemplates(builtIns: Template[], apiTemplates: any[]): Template[] {
  const result = [...builtIns];
  for (const t of apiTemplates) {
    const slug: string = t.slug ?? "";
    const existingIdx = result.findIndex((b) => b.id === slug);
    const merged: Template = {
      id: slug || String(t.id),
      apiId: t.id,
      name: t.name,
      desc: t.description ?? "",
      category: t.category ?? "placement",
      hasLetterhead: t.has_letterhead ?? false,
      hasSignature: t.has_signature ?? false,
      lastModified: (t.updated_at ?? t.created_at ?? "").slice(0, 10),
      version: t.version ?? "1.0",
      placeholders: t.placeholders ?? [],
      status: t.status ?? "Active",
      visibleTo: t.visible_to ?? [],
      body: t.body ?? undefined,
      signatureUrl: t.signature_url ?? undefined,
      versionHistory: t.version_history ?? [],
      isBuiltIn: existingIdx !== -1,
    };
    if (existingIdx !== -1) {
      result[existingIdx] = merged;
    } else {
      result.push(merged);
    }
  }
  return result;
}

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>(BUILT_IN_TEMPLATES);
  const [apiLoading, setApiLoading] = useState(true);
  const [allowOverride, setAllowOverride] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const defaultRoles = {
    placement: ["CLO", "DLO", "Student"],
    evaluation: ["Academic Supervisor", "Industry Supervisor", "DLO"],
    admin: ["CLO", "DLO"],
  };

  const [newTemplate, setNewTemplate] = useState<Partial<Template>>({
    name: "", desc: "", category: "placement",
    hasLetterhead: true, hasSignature: true,
    placeholders: [], visibleTo: defaultRoles["placement"], body: "",
  });
  const [newPlaceholder, setNewPlaceholder] = useState("");
  const [editBody, setEditBody] = useState("");

  // Load server-side templates and merge over built-ins
  useEffect(() => {
    apiClient.getTemplates().then((res) => {
      if (res.success && res.data.length > 0) {
        setTemplates(mergeApiTemplates(BUILT_IN_TEMPLATES, res.data));
      }
    }).catch(() => {}).finally(() => setApiLoading(false));
  }, []);

  const selected = selectedTemplate ? templates.find((t) => t.id === selectedTemplate) : null;

  useEffect(() => {
    setEditBody(selected?.body || "");
  }, [selectedTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

  const bumpVersion = (version: string): string => {
    const parts = version.split(".").map((n) => parseInt(n, 10) || 0);
    parts[parts.length - 1] += 1;
    return parts.join(".");
  };

  const handleSaveTemplateChanges = async () => {
    if (!selected) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const nextVersion = bumpVersion(selected.version);
    const newEntry: VersionEntry = {
      version: nextVersion, date: today,
      changes: "Body updated via template editor",
      author: "CLO",
    };

    if (selected.apiId) {
      // Persist to server
      const res = await apiClient.updateTemplate(String(selected.apiId), {
        body: editBody,
        change_note: "Body updated via template editor",
      });
      if (!res.success) {
        toast.error(res.message ?? "Failed to save template.");
        setSaving(false);
        return;
      }
      const updated = res.data;
      setTemplates((prev) => prev.map((t) =>
        t.id === selected.id
          ? { ...t, body: editBody, lastModified: today, version: updated?.version ?? nextVersion, versionHistory: updated?.version_history ?? [...t.versionHistory, newEntry] }
          : t
      ));
    } else {
      // Built-in not yet persisted — create it on the server with the override body
      const res = await apiClient.createTemplate({
        slug: selected.id,
        name: selected.name,
        description: selected.desc,
        category: selected.category,
        body: editBody,
        placeholders: selected.placeholders,
        visible_to: selected.visibleTo,
        has_letterhead: selected.hasLetterhead,
        has_signature: selected.hasSignature,
        status: selected.status,
      });
      if (!res.success) {
        toast.error(res.message ?? "Failed to save template.");
        setSaving(false);
        return;
      }
      setTemplates((prev) => prev.map((t) =>
        t.id === selected.id
          ? { ...t, apiId: res.data?.id, body: editBody, lastModified: today, version: nextVersion, versionHistory: [...t.versionHistory, newEntry] }
          : t
      ));
    }

    setSaving(false);
    toast.success("Template saved.");
  };

  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected) return;
    setUploadingSignature(true);
    try {
      const res = await apiClient.uploadFile(file, "iams/templates");
      if (!res.success || !res.data?.url) {
        toast.error(res.message ?? "Failed to upload signature.");
        return;
      }
      const signatureUrl = res.data.url;
      const today = new Date().toISOString().split("T")[0];

      if (selected.apiId) {
        await apiClient.updateTemplate(String(selected.apiId), { signature_url: signatureUrl, change_note: "Signature updated" });
      } else {
        await apiClient.createTemplate({
          slug: selected.id, name: selected.name, description: selected.desc,
          category: selected.category, body: selected.body ?? "",
          placeholders: selected.placeholders, visible_to: selected.visibleTo,
          has_letterhead: selected.hasLetterhead, has_signature: selected.hasSignature,
          signature_url: signatureUrl, status: selected.status,
        }).then((res) => {
          if (res.success && res.data?.id) {
            setTemplates((prev) => prev.map((t) => t.id === selected.id ? { ...t, apiId: res.data.id } : t));
          }
        });
      }

      setTemplates((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, signatureUrl, lastModified: today } : t))
      );
      toast.success("Signature uploaded.");
    } catch {
      toast.error("Failed to upload signature.");
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleDownload = (t: Template) => {
    const body = t.body ?? "(No body content)";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${t.name}</title>
<style>body{font-family:Georgia,serif;line-height:1.7;color:#333;padding:1in;max-width:8.5in;margin:0 auto}
h1{color:#1e3a5f;font-size:1.2rem;margin-bottom:1rem}.placeholder{color:#0b5ed7;font-weight:600}
@media print{.no-print{display:none}}</style></head>
<body>
<div class="no-print" style="text-align:center;margin-bottom:1rem">
<button onclick="window.print()" style="padding:0.5rem 1.5rem;background:#1e3a5f;color:#fff;border:none;border-radius:4px;cursor:pointer">Print / Save as PDF</button>
</div>
<h1>${t.name}</h1>
<p style="color:#666;font-size:0.85rem">Version ${t.version} · ${t.category} · ${t.lastModified}</p>
<hr/>
<div>${body.split("\n").filter(l => l.trim()).map(l =>
  `<p>${l.replace(/\[([^\]]+)\]/g, '<span class="placeholder">[$1]</span>')}</p>`
).join("")}</div>
<hr/><p style="font-size:0.75rem;color:#999">Placeholders: ${t.placeholders.join(", ")}</p>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const handleDuplicate = async (t: Template) => {
    const newSlug = `${t.id}-copy-${Date.now()}`;
    const copy: Template = {
      ...t,
      id: newSlug,
      apiId: undefined,
      name: `${t.name} (Copy)`,
      status: "Draft",
      version: "1.0",
      versionHistory: [{ version: "1.0", date: new Date().toISOString().split("T")[0], changes: `Duplicated from "${t.name}"`, author: "CLO" }],
      lastModified: new Date().toISOString().split("T")[0],
      isBuiltIn: false,
    };

    const res = await apiClient.createTemplate({
      slug: newSlug, name: copy.name, description: copy.desc,
      category: copy.category, body: copy.body ?? "",
      placeholders: copy.placeholders, visible_to: copy.visibleTo,
      has_letterhead: copy.hasLetterhead, has_signature: copy.hasSignature,
      status: "Draft",
    });
    if (res.success && res.data?.id) copy.apiId = res.data.id;

    setTemplates((prev) => [copy, ...prev]);
    toast.success(`"${t.name}" duplicated as a draft.`);
  };

  const handleDeleteTemplate = async (t: Template) => {
    if (t.isBuiltIn) { toast.error("Built-in templates cannot be deleted."); return; }
    if (!t.apiId) {
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      toast.success("Template removed.");
      return;
    }
    const res = await apiClient.deleteTemplate(String(t.apiId));
    if (!res.success) { toast.error(res.message ?? "Failed to delete template."); return; }
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    if (selectedTemplate === t.id) setSelectedTemplate(null);
    toast.success("Template deleted.");
  };

  const displayPlaceholders = Array.from(new Set([
    ...(newTemplate.placeholders || []),
    ...(newTemplate.body?.match(/\[.*?\]/g) || []),
  ]));

  const handleSaveNewTemplate = async () => {
    if (!newTemplate.name) { toast.error("Template name is required"); return; }
    if (templates.some(t => t.name.toLowerCase() === newTemplate.name!.toLowerCase())) {
      toast.error("A template with this name already exists"); return;
    }
    setSaving(true);
    const slug = `custom-${newTemplate.name!.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const res = await apiClient.createTemplate({
      slug, name: newTemplate.name!, description: newTemplate.desc ?? "",
      category: newTemplate.category!, body: newTemplate.body ?? "",
      placeholders: displayPlaceholders, visible_to: newTemplate.visibleTo ?? [],
      has_letterhead: !!newTemplate.hasLetterhead, has_signature: !!newTemplate.hasSignature,
      status: "Draft",
    });

    const newTpl: Template = {
      id: slug, apiId: res.success ? res.data?.id : undefined,
      name: newTemplate.name!, desc: newTemplate.desc ?? "",
      category: newTemplate.category as "placement" | "evaluation" | "admin",
      hasLetterhead: !!newTemplate.hasLetterhead, hasSignature: !!newTemplate.hasSignature,
      lastModified: new Date().toISOString().split("T")[0],
      version: "1.0", status: "Draft",
      placeholders: displayPlaceholders,
      visibleTo: newTemplate.visibleTo ?? [],
      body: newTemplate.body ?? "",
      versionHistory: [{ version: "1.0", date: new Date().toISOString().split("T")[0], changes: "Created", author: "CLO" }],
      isBuiltIn: false,
    };

    setTemplates([newTpl, ...templates]);
    setShowNewTemplate(false);
    setNewTemplate({ name: "", desc: "", category: "placement", hasLetterhead: true, hasSignature: true, placeholders: [], visibleTo: defaultRoles["placement"], body: "" });
    setSaving(false);
    if (!res.success) toast.warning("Template saved locally but could not persist to server.");
    else toast.success("Template created successfully.");
  };

  const handleAddPlaceholder = () => {
    if (!newPlaceholder.trim()) return;
    const formatted = `[${newPlaceholder.trim()}]`;
    if (!newTemplate.placeholders?.includes(formatted)) {
      setNewTemplate(prev => ({ ...prev, placeholders: [...(prev.placeholders || []), formatted] }));
    }
    setNewPlaceholder("");
  };

  const handleRemovePlaceholder = (ph: string) => {
    setNewTemplate(prev => {
      const next = { ...prev };
      if (next.placeholders) next.placeholders = next.placeholders.filter(p => p !== ph);
      if (next.body?.includes(ph)) next.body = next.body.split(ph).join(ph.slice(1, -1));
      return next;
    });
  };

  const toggleRole = (role: string) => {
    setNewTemplate(prev => {
      const current = prev.visibleTo || [];
      return { ...prev, visibleTo: current.includes(role) ? current.filter(r => r !== role) : [...current, role] };
    });
  };

  const filtered = categoryFilter === "all" ? templates : templates.filter((t) => t.category === categoryFilter);

  const categoryColors: Record<string, string> = {
    placement: "bg-blue-100 text-blue-700",
    evaluation: "bg-violet-100 text-violet-700",
    admin: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Document Templates</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            Manage placement letters, evaluation forms, and document templates · {templates.length} templates
          </p>
        </div>
        <button
          onClick={() => setShowNewTemplate(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Templates", value: templates.length, color: "text-blue-600 bg-blue-50", icon: FileText },
          { label: "Active", value: templates.filter((t) => t.status === "Active").length, color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
          { label: "Drafts", value: templates.filter((t) => t.status === "Draft").length, color: "text-amber-600 bg-amber-50", icon: Edit3 },
          { label: "With Letterhead", value: templates.filter((t) => t.hasLetterhead).length, color: "text-violet-600 bg-violet-50", icon: FileText },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{s.label}</p>
              <p style={{ fontSize: "1.25rem" }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "placement", "evaluation", "admin"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg border capitalize transition-colors ${
              categoryFilter === cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
            }`}
            style={{ fontSize: "0.8rem" }}
          >
            {cat === "all" ? "All Templates" : cat}
          </button>
        ))}
      </div>

      {apiLoading && (
        <div className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading server templates…
        </div>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelectedTemplate(t.id)}
            className={`bg-card border rounded-xl p-5 space-y-3 cursor-pointer hover:shadow-[0_2px_12px_rgba(11,94,215,0.08)] transition-shadow ${
              selectedTemplate === t.id ? "border-primary ring-1 ring-primary" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p style={{ fontSize: "0.9rem" }}>{t.name}</p>
                  <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground mt-0.5 truncate max-w-[200px]">{t.desc}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full capitalize ${categoryColors[t.category]}`} style={{ fontSize: "0.65rem" }}>{t.category}</span>
              <span className={`px-2 py-0.5 rounded-full ${t.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`} style={{ fontSize: "0.65rem" }}>{t.status}</span>
              <span className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>v{t.version}</span>
              {t.hasLetterhead && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700" style={{ fontSize: "0.6rem" }}>Letterhead</span>}
              {t.hasSignature && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700" style={{ fontSize: "0.6rem" }}>Signature</span>}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem" }}>
                <Clock className="w-3 h-3" /> Modified {t.lastModified}
              </span>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowPreview(t.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Preview">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDownload(t)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Download / Print">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDuplicate(t)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Duplicate">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {!t.isBuiltIn && (
                  <button onClick={() => handleDeleteTemplate(t)} className="p-1.5 rounded-md hover:bg-accent text-red-500" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTemplate(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3>Template Details</h3>
                <button onClick={() => setSelectedTemplate(null)} className="p-1 rounded-md hover:bg-accent">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p style={{ fontSize: "0.9rem" }}>{selected.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full capitalize ${categoryColors[selected.category]}`} style={{ fontSize: "0.6rem" }}>{selected.category}</span>
                    <span className={`px-2 py-0.5 rounded-full ${selected.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`} style={{ fontSize: "0.6rem" }}>{selected.status}</span>
                  </div>
                </div>
              </div>

              {[
                ["Version", `v${selected.version}`],
                ["Last Modified", selected.lastModified],
                ["Category", selected.category],
                ["Has Letterhead", selected.hasLetterhead ? "Yes" : "No"],
                ["Has Signature", selected.hasSignature ? "Yes" : "No"],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{l as string}</p>
                  <p style={{ fontSize: "0.85rem" }} className="capitalize">{v as string}</p>
                </div>
              ))}

              <div>
                <p className="text-muted-foreground mb-2" style={{ fontSize: "0.7rem" }}>PLACEHOLDER FIELDS</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.placeholders.map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-secondary rounded text-secondary-foreground" style={{ fontSize: "0.7rem" }}>{p}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2" style={{ fontSize: "0.7rem" }}>VISIBLE TO</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.visibleTo.map((role) => (
                    <span key={role} className="px-2 py-0.5 border border-border rounded text-foreground" style={{ fontSize: "0.7rem" }}>{role}</span>
                  ))}
                </div>
              </div>

              {/* Editable body */}
              <div className="pt-3 border-t border-border space-y-2">
                <label className="block text-sm font-medium">Template Content (Body)</label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-y h-40 font-mono text-sm leading-relaxed"
                  placeholder="Type the body of the letter or document here..."
                />
              </div>

              {/* Letterhead / Signature */}
              {selected.hasLetterhead && (
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/40 transition-colors cursor-pointer">
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">Upload letterhead</p>
                    <p style={{ fontSize: "0.65rem" }} className="text-muted-foreground mt-0.5">Current: HTU crest letterhead</p>
                  </div>
                  {selected.hasSignature && (
                    <>
                      <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureFileChange} />
                      <div
                        onClick={() => signatureInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-lg p-3 text-center hover:border-primary/40 transition-colors cursor-pointer"
                      >
                        {uploadingSignature ? (
                          <Loader2 className="w-5 h-5 mx-auto animate-spin text-primary" />
                        ) : selected.signatureUrl ? (
                          <img src={selected.signatureUrl} alt="Signature" className="h-10 mx-auto object-contain mb-1" />
                        ) : (
                          <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                        )}
                        <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">
                          {selected.signatureUrl ? "Click to replace signature image" : "Upload signature image"}
                        </p>
                        {!selected.signatureUrl && (
                          <p style={{ fontSize: "0.65rem" }} className="text-muted-foreground mt-0.5">No signature uploaded yet</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span style={{ fontSize: "0.8rem" }}>Allow dept. override</span>
                        <button
                          onClick={() => setAllowOverride(!allowOverride)}
                          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${allowOverride ? "bg-primary" : "bg-gray-300"}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allowOverride ? "translate-x-4" : "translate-x-0.5"}`} style={{ left: 0 }} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => setShowPreview(selected.id)} className="flex-1 py-2 border border-border rounded-lg hover:bg-accent flex items-center justify-center gap-1.5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button onClick={() => setShowHistory(selected.id)} className="flex-1 py-2 border border-border rounded-lg hover:bg-accent flex items-center justify-center gap-1.5 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
                    <History className="w-3.5 h-3.5" /> History
                  </button>
                </div>
                <button
                  onClick={handleSaveTemplateChanges}
                  disabled={saving}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5"
                  style={{ fontSize: "0.8rem" }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Template Modal */}
      {showNewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewTemplate(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Create New Template</h2>
              <button onClick={() => setShowNewTemplate(false)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Template Name</label>
                  <input type="text" value={newTemplate.name} onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background" placeholder="e.g. Mid-Term Evaluation Form" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={newTemplate.desc} onChange={(e) => setNewTemplate({...newTemplate, desc: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none h-16"
                    placeholder="Brief description of the template's purpose..." />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select value={newTemplate.category} onChange={(e) => {
                    const cat = e.target.value as "placement" | "evaluation" | "admin";
                    setNewTemplate(prev => ({ ...prev, category: cat, visibleTo: defaultRoles[cat] }));
                  }} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                    <option value="placement">Placement</option>
                    <option value="evaluation">Evaluation</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-medium">Template Content (Body)</label>
                  <textarea value={newTemplate.body || ""} onChange={(e) => setNewTemplate({...newTemplate, body: e.target.value})}
                    className="w-full px-4 py-3 border border-border rounded-lg bg-background resize-y h-48 font-mono text-sm leading-relaxed"
                    placeholder={"Type the body here...\n\ne.g. Dear [Student Name],\nWe are pleased to inform you that you have been placed at [Company Name]."} />
                  <p className="text-xs text-muted-foreground">
                    Tip: Text wrapped in brackets like <span className="text-primary font-medium">[Student Name]</span> will be auto-detected as a placeholder.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-sm font-medium">Dynamic Placeholders</label>
                  <div className="flex gap-2">
                    <input type="text" value={newPlaceholder}
                      onChange={(e) => setNewPlaceholder(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPlaceholder())}
                      className="flex-1 px-3 py-2 border border-border rounded-lg bg-background" placeholder="e.g. Student Name" />
                    <button onClick={handleAddPlaceholder} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90">Add</button>
                  </div>
                  {displayPlaceholders.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/30 rounded-lg border border-border">
                      {displayPlaceholders.map((ph) => (
                        <span key={ph} className="flex items-center gap-1.5 px-2.5 py-1 bg-background border border-border rounded-full text-sm shadow-sm">
                          <span className="text-primary font-medium">{ph}</span>
                          <button onClick={() => handleRemovePlaceholder(ph)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <label className="block text-sm font-medium">Branding Options</label>
                  {[
                    { key: "hasLetterhead" as const, label: "Include Letterhead", desc: "University logo and address header" },
                    { key: "hasSignature" as const, label: "Include Official Signature", desc: "Authorized stamp and digital signature" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div><p className="font-medium text-sm">{label}</p><p className="text-muted-foreground text-xs">{desc}</p></div>
                      <button onClick={() => setNewTemplate(prev => ({...prev, [key]: !prev[key]}))}
                        className={`w-10 h-6 rounded-full transition-colors relative ${newTemplate[key] ? "bg-primary" : "bg-gray-300"}`}>
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${newTemplate[key] ? "translate-x-5" : "translate-x-1"}`} style={{ left: 0 }} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Visible To (Role Access)</label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Smart defaults applied</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["CLO", "DLO", "Academic Supervisor", "Industry Supervisor", "Student"].map((role) => {
                      const isSelected = newTemplate.visibleTo?.includes(role);
                      return (
                        <button key={role} onClick={() => toggleRole(role)}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-accent"}`}>
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 shrink-0 bg-muted/30">
              <button onClick={() => setShowNewTemplate(false)} className="px-4 py-2 border border-border rounded-lg hover:bg-accent text-sm">Cancel</button>
              <button onClick={handleSaveNewTemplate} disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-2 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (() => {
        const tpl = templates.find((t) => t.id === showPreview);
        if (!tpl) return null;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(null)}>
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /><h2>Preview: {tpl.name}</h2></div>
                <button onClick={() => setShowPreview(null)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-8">
                {tpl.hasLetterhead && (
                  <div className="border-b-2 border-blue-800 pb-4 mb-6 text-center">
                    <img src="/logo%201.png" alt="" className="h-14 mx-auto mb-2 object-contain" />
                    <p className="text-blue-900" style={{ fontSize: "1.1rem" }}>HO TECHNICAL UNIVERSITY</p>
                    <p className="text-gray-600" style={{ fontSize: "0.8rem" }}>P.O. Box HP 217, Ho, Volta Region, Ghana</p>
                    <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>Tel: +233 362 194 410 · Email: liaison@htu.edu.gh</p>
                  </div>
                )}
                <div className="text-right mb-6">
                  <p className="text-gray-500" style={{ fontSize: "0.85rem" }}>Date: <span className="text-gray-400">[Current Date]</span></p>
                  <p className="text-gray-500" style={{ fontSize: "0.85rem" }}>Ref: HTU/IA/2026/<span className="text-gray-400">[Ref No]</span></p>
                </div>
                {tpl.body ? (
                  <div className="space-y-4" style={{ fontSize: "0.95rem", lineHeight: "1.8" }}>
                    {tpl.body.split("\n").map((paragraph, i) => (
                      <p key={i} className="min-h-[1.5em]">
                        {paragraph.split(/(\[.*?\])/g).map((part, j) =>
                          part.startsWith("[") && part.endsWith("]")
                            ? <span key={j} className="text-primary font-medium">{part}</span>
                            : <span key={j}>{part}</span>
                        )}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No custom body text. This is a generic or interactive document template.</p>
                )}
                {tpl.hasSignature && (
                  <div className="mt-8 pt-4 border-t border-gray-200">
                    {tpl.signatureUrl
                      ? <img src={tpl.signatureUrl} alt="Signature" className="h-12 mb-1 object-contain" />
                      : <div className="w-32 h-12 border-b-2 border-gray-400 mb-1" />}
                    <p style={{ fontSize: "0.85rem" }}>Central Liaison Officer</p>
                    <p className="text-gray-500" style={{ fontSize: "0.75rem" }}>Ho Technical University</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <span className="text-gray-500" style={{ fontSize: "0.75rem" }}>
                  {tpl.placeholders.length} placeholder fields · Version {tpl.version}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { handleDownload(tpl); setShowPreview(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button onClick={() => setShowPreview(null)} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90" style={{ fontSize: "0.85rem" }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Version History Modal — per-template */}
      {showHistory && (() => {
        const tpl = templates.find((t) => t.id === showHistory);
        if (!tpl) return null;
        const history = [...tpl.versionHistory].reverse();
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(null)}>
            <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Version History — {tpl.name}</h2>
                <button onClick={() => setShowHistory(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-0 max-h-80 overflow-y-auto">
                {history.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">No version history yet.</p>
                )}
                {history.map((v, i) => (
                  <div key={v.version} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${i === 0 ? "bg-primary" : "bg-border"}`} />
                      {i < history.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: "0.85rem" }}>v{v.version}</span>
                        <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{v.date}</span>
                        {i === 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full" style={{ fontSize: "0.6rem" }}>Current</span>}
                      </div>
                      <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.8rem" }}>{v.changes}</p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>By {v.author}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border">
                <button onClick={() => setShowHistory(null)} className="w-full py-2 border border-border rounded-lg hover:bg-accent" style={{ fontSize: "0.85rem" }}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
