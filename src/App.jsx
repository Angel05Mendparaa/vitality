import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Microscope, BarChart3, Users, FileText, Settings as SettingsIcon,
  Upload, FolderOpen, Target, Package, Zap,
  AlertTriangle, Star, Bot, User, Download, Plus, Search, LogOut
} from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './index.css';

// ═══════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════
const API_BASE = 'https://embryo-backend-eakn.onrender.com';

const defaultSettings = {
  clinicName: 'SpringHealth Fertility Center',
  theme: 'light',
  notifications: true
};

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════
function getScoreClass(score) {
  if (score >= 60) return 'good';
  if (score >= 15) return 'marginal';
  return 'poor';
}

async function fetchInsightFromBackend(result, totalEmbryos) {

  const res = await fetch(`${API_BASE}/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...result,
      rank: result.rank || 1,
      total_embryos: totalEmbryos || 1
    }),
  });
  
  if (!res.ok) throw new Error('Failed to fetch insight from backend');
  const data = await res.json();
  // The API just returns the raw string content as shown in the docs
  return data;
}

// ═══════════════════════════════════════════════════════
// UI Sub-Components
// ═══════════════════════════════════════════════════════

function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Microscope size={18} />
      </div>
      <nav className="sidebar-nav">
        <button 
          className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
          onClick={() => onTabChange('dashboard')}
          title="Dashboard"
        >
          <BarChart3 size={18} />
        </button>
        <button 
          className={`sidebar-item ${activeTab === 'analysis' ? 'active' : ''}`} 
          onClick={() => onTabChange('analysis')}
          title="Embryo Analysis"
        >
          <Microscope size={18} />
        </button>
        <button 
          className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`} 
          onClick={() => onTabChange('reports')}
          title="Reports"
        >
          <FileText size={18} />
        </button>
        <button 
          className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`} 
          onClick={() => onTabChange('settings')}
          title="Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </nav>
    </aside>
  );
}

function Header({ serverOk, clinicName, user, logout }) {
  return (
    <header className="header">
      <div className="header-left">
        <a href="/" className="header-logo">
          <span className="logo-icon">
            <Microscope size={18} />
          </span>
          <span>Embryo<span className="logo-highlight">AI</span></span>
        </a>
      </div>
      <div className="header-right">
        <span className="header-clinic">{clinicName}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
          {user?.picture ? (
            <img src={user.picture} alt={user.name} style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
          ) : (
            <div className="header-avatar" title="Profile">
              <User size={15} />
            </div>
          )}
          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{user?.name?.split('@')[0]}</span>
          <button 
            className="btn btn-ghost" 
            style={{ padding: '6px 10px', marginLeft: '8px' }}
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            title="Log Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

function StatsRow() {
  return (
    <div className="stats-row">
      <div className="stat-card">
        <div>
          <div className="stat-card-label">Model Accuracy (AUC)</div>
          <div className="stat-card-value">0.96</div>
        </div>
        <div className="stat-card-icon green">
          <Target size={20} />
        </div>
      </div>
      <div className="stat-card">
        <div>
          <div className="stat-card-label">Max Batch Size</div>
          <div className="stat-card-value">50</div>
        </div>
        <div className="stat-card-icon coral">
          <Package size={20} />
        </div>
      </div>
      <div className="stat-card">
        <div>
          <div className="stat-card-label">Avg Processing Time</div>
          <div className="stat-card-value">~2s</div>
        </div>
        <div className="stat-card-icon amber">
          <Zap size={20} />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ embryos }) {
  const good = embryos.filter((e) => e.viability_score_percent >= 60).length;
  const poor = embryos.filter((e) => e.viability_score_percent < 15).length;
  const best = Math.max(...embryos.map((e) => e.viability_score_percent));

  return (
    <div className="summary-row">
      <div className="summary-card">
        <div className="summary-label">Total Analyzed</div>
        <div className="summary-value accent">{embryos.length}</div>
      </div>
      <div className="summary-card">
        <div className="summary-label">Good Quality</div>
        <div className="summary-value good">{good}</div>
      </div>
      <div className="summary-card">
        <div className="summary-label">Poor Quality</div>
        <div className="summary-value poor">{poor}</div>
      </div>
      <div className="summary-card">
        <div className="summary-label">Best Score</div>
        <div className="summary-value good">{best.toFixed(1)}%</div>
      </div>
    </div>
  );
}

function AIInsightBox({ insight, isLoading }) {
  return (
    <div className="ai-insight-box">
      <div className="ai-insight-header">
        <Bot size={13} /> AI Clinical Insight
      </div>
      {isLoading ? (
        <>
          <div className="skeleton-line w90" />
          <div className="skeleton-line w80" />
          <div className="skeleton-line w60" />
        </>
      ) : insight === null ? (
        <div className="ai-insight-error">
          AI insight unavailable — please try again later.
        </div>
      ) : insight ? (
        <div className="ai-insight-text">{insight}</div>
      ) : (
        <div className="ai-insight-error">Waiting for analysis...</div>
      )}
    </div>
  );
}

function UploadZone({ files, previews, onFilesSelected, onRemove, onClear, onAnalyze, loading }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (droppedFiles.length) onFilesSelected(droppedFiles);
  }, [onFilesSelected]);

  const handleChange = useCallback((e) => {
    const selected = Array.from(e.target.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (selected.length) onFilesSelected(selected);
    e.target.value = '';
  }, [onFilesSelected]);

  return (
    <section className="upload-section">
      <div className="upload-card">
        <div className="upload-card-header">
          <div>
            <div className="upload-card-title">Upload Embryo Batch</div>
            <div className="upload-card-desc">Upload multiple embryo images for AI analysis</div>
          </div>
          <div className="upload-card-icon">
            <FolderOpen size={18} />
          </div>
        </div>

        <div
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          <div className="upload-icon-wrapper">
            <Upload size={22} />
          </div>
          <div className="upload-title">Drop embryo images here</div>
          <div className="upload-subtitle">or click to browse files</div>
          <div className="upload-formats">
            Supported formats: JPG, PNG, TIFF · Max 50MB per file
          </div>
        </div>

        {previews.length > 0 && (
          <div className="preview-section">
            <div className="preview-grid">
              {previews.map((p, i) => (
                <div className="preview-card" key={p.name + i}>
                  <img src={p.url} alt={p.name} loading="lazy" />
                  <button
                    className="preview-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                    }}
                  >
                    ✕
                  </button>
                  <div className="preview-name">{p.name}</div>
                </div>
              ))}
            </div>
            <div className="action-bar">
              <button
                className="btn btn-primary"
                onClick={onAnalyze}
                disabled={loading || files.length === 0}
              >
                <Microscope size={15} />
                {loading ? 'Analyzing...' : 'Analyze Batch'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={onClear}
                disabled={loading}
              >
                Clear All
              </button>
              <span className="file-count">
                {files.length} image{files.length !== 1 ? 's' : ''} selected
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <div className="loading-title">Analyzing embryos...</div>
      <div className="loading-subtitle">
        First request may take ~30s to wake the server
      </div>
    </div>
  );
}

function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="error-box">
      <div className="error-icon">
        <AlertTriangle size={18} />
      </div>
      <div>
        <div className="error-message">{error}</div>
        <div className="error-hint">
          If this is your first request, the server may be cold-starting (~30s).
          Please try again.
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result, rank, total, previewUrl, insight, insightLoading }) {
  const scoreClass = getScoreClass(result.viability_score_percent);
  const isRank1 = rank === 1 && total > 1;
  const [animWidth, setAnimWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimWidth(result.viability_score_percent);
    }, 100);
    return () => clearTimeout(timer);
  }, [result.viability_score_percent]);

  return (
    <div className={`result-card ${isRank1 ? 'rank-1' : ''}`}>
      {isRank1 && (
        <div className="recommended-badge">
          <Star size={13} fill="currentColor" /> Recommended Top Choice
        </div>
      )}

      <div className="result-image-container">
        {previewUrl && (
          <img src={previewUrl} alt={result.filename} className="result-image" />
        )}
        {total > 1 && (
          <span className={`rank-badge ${isRank1 ? 'rank-1' : ''}`}>
            {result.embryo_id || `EMB-${String(rank).padStart(3, '0')}`}
          </span>
        )}
        <span className={`quality-dot-overlay ${scoreClass}`} />
      </div>

      <div className="result-body">
        <div className="result-header">
          <div>
            <div className="result-label">{result.label}</div>
            <div className="result-filename">{result.filename}</div>
          </div>
        </div>

        <div className="viability-section">
          <div className="viability-label">Viability Score</div>
          <div className={`viability-value ${scoreClass}`}>
            {result.viability_score_percent.toFixed(0)}%
          </div>
          <div className="score-bar-track">
            <div
              className={`score-bar-fill ${scoreClass}`}
              style={{ width: `${Math.min(animWidth, 100)}%` }}
            />
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-cell">
            <div className="stat-cell-label">Class</div>
            <div className="stat-cell-value">{result.label?.split(' ')[0]}</div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell-label">Confidence</div>
            <div className="stat-cell-value">
              {(result.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-cell">
            <div className="stat-cell-label">Morphology</div>
            <div className="stat-cell-value">
              {(result.good_probability * 100).toFixed(1)}%
            </div>
          </div>
          <div className="stat-cell">
            <div className="stat-cell-label">Cells</div>
            <div className="stat-cell-value">{result.cell_count ?? 'N/A'}</div>
          </div>
        </div>

        <div className="detail-rows">
          <div className="detail-item">
            <span className="detail-label">Fragmentation:</span>
            {(result.fragmentation_ratio * 100).toFixed(2)}%
          </div>
          <div className="detail-item">
            <span className="detail-label">Symmetry:</span>
            {result.symmetry_score}
          </div>
        </div>

        <AIInsightBox insight={insight} isLoading={insightLoading} />

        <div className={`recommendation ${scoreClass}`}>
          {result.recommendation}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Application TABS
// ═══════════════════════════════════════════════════════

function DashboardTab() {
  return (
    <div className="tab-content">
      <div className="page-title-section">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">Welcome back. Here is your recent activity and summary.</p>
      </div>

      <StatsRow />

      <div className="dashboard-grid">
        <div className="card">
          <h2 className="card-title">Analysis History (30 Days)</h2>
          <div className="chart-placeholder">
            Chart visualization will appear here
          </div>
        </div>
        <div className="card">
          <h2 className="card-title">Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon analyze"><Microscope size={16} /></div>
              <div className="activity-content">
                <div className="activity-title">Batch EMB-094 Analyzed</div>
                <div className="activity-time">2 hours ago • 4 embryos</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon report"><FileText size={16} /></div>
              <div className="activity-content">
                <div className="activity-title">Report generated for Patient #439</div>
                <div className="activity-time">Yesterday • Dr. Sarah Chen</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon analyze"><Microscope size={16} /></div>
              <div className="activity-content">
                <div className="activity-title">Batch EMB-093 Analyzed</div>
                <div className="activity-time">Yesterday • 6 embryos</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon report"><FileText size={16} /></div>
              <div className="activity-content">
                <div className="activity-title">Report generated for Patient #421</div>
                <div className="activity-time">2 days ago • Dr. Michael Wong</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="tab-content">
      <div className="page-title-section">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your organization and API configurations.</p>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h2 className="card-title"><User size={18} /> Organization Profile</h2>
        <div className="input-group">
          <label className="input-label">Clinic / Organization Name</label>
          <input 
            type="text" 
            name="clinicName"
            className="input-field" 
            value={localSettings.clinicName}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label className="input-label">Administrator Email</label>
          <input 
            type="email" 
            className="input-field" 
            defaultValue="admin@springhealth.com"
          />
        </div>
      </div>

      <div style={{ maxWidth: '600px', display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
}

function ReportsTab({ reports, settings }) {
  
  const handleDownloadPDF = (report) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(17, 24, 39); // gray-900
    doc.text('Embryo Analysis Report', 14, 22);
    
    // Clinic Info
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(settings.clinicName || 'Fertility Center', 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    
    // Patient Info Box
    doc.setDrawColor(229, 231, 235);
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(14, 42, 182, 30, 3, 3, 'FD');
    
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.text(`Patient ID: ${report.patient}`, 20, 52);
    doc.text(`Report ID: ${report.id}`, 20, 60);
    doc.text(`Batch Ref: ${report.batch}`, 100, 52);
    doc.text(`Date Analyzed: ${report.date}`, 100, 60);

    // If we have actual embryo data stored in the report object, we can table it.
    // Down below when we create the report object, we need to attach the embryos array to it.
    
    let startY = 85;
    
    if (report.embryos && report.embryos.length > 0) {
      doc.setFontSize(14);
      doc.text(`Analyzed Embryos (${report.count})`, 14, startY);
      
      const tableColumn = ["Rank", "Embryo ID", "Score", "Quality", "Confidence", "Action"];
      const tableRows = [];

      report.embryos.forEach(emb => {
        const quality = emb.viability_score_percent >= 60 ? 'Good' : emb.viability_score_percent >= 15 ? 'Marginal' : 'Poor';
        const record = [
          emb.rank || '-',
          emb.embryo_id || emb.filename,
          `${emb.viability_score_percent.toFixed(1)}%`,
          quality,
          `${(emb.confidence * 100).toFixed(1)}%`,
          emb.recommendation
        ];
        tableRows.push(record);
      });

      doc.autoTable({
        startY: startY + 6,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [240, 242, 245], textColor: [100, 110, 120] },
        styles: { fontSize: 9, cellPadding: 4 },
        alternateRowStyles: { fillColor: [250, 250, 250] }
      });
    } else {
      doc.setFontSize(12);
      doc.text("Analysis summary records (No detailed row data available)", 14, startY);
    }
    
    doc.save(`${report.id}_${report.patient.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="tab-content">
      <div className="page-title-section">
        <h1 className="page-title">Analysis Reports</h1>
        <p className="page-subtitle">View and download past embryo analysis reports and clinical insights.</p>
      </div>

      <div className="card">
        <div className="action-bar" style={{ marginBottom: '20px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="input-group" style={{ margin: 0, width: '250px' }}>
              <input type="text" className="input-field" placeholder="Search reports..." />
            </div>
            <button className="btn btn-ghost"><Search size={15} /> Search</button>
          </div>
          <button className="btn btn-primary"><Plus size={15} /> New Report</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="reports-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Date</th>
                <th>Patient ID</th>
                <th>Batch Reference</th>
                <th>Embryos</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => (
                <tr key={report.id || idx}>
                  <td style={{ fontWeight: 500 }}>{report.id}</td>
                  <td>{report.date}</td>
                  <td>{report.patient}</td>
                  <td style={{ fontFamily: 'var(--font)' }}>{report.batch}</td>
                  <td>{report.count} analyzed</td>
                  <td>
                    <span className={`report-badge ${report.status === 'Completed' ? 'success' : 'pending'}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '6px 12px' }} 
                      title="Download PDF"
                      onClick={() => handleDownloadPDF(report)}
                    >
                      <Download size={14} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    No analysis reports generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Auth Guard Component
// ═══════════════════════════════════════════════════════

function LoginScreen() {
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <div style={{ width: '100vw', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'auto', textAlign: 'center', padding: '40px 30px' }}>
        <div className="sidebar-logo" style={{ margin: '0 auto 20px', width: '50px', height: '50px' }}>
          <Microscope size={24} />
        </div>
        <h1 className="page-title" style={{ fontSize: '1.4rem' }}>Embryo<span style={{ color: 'var(--accent)' }}>AI</span></h1>
        <p className="page-subtitle" style={{ marginBottom: '30px' }}>Clinical Embryo Viability Analysis</p>
        
        {isLoading ? (
          <div className="loading-state" style={{ padding: '20px 0' }}>
            <div className="spinner" />
            <div className="loading-subtitle">Authenticating...</div>
          </div>
        ) : (
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            onClick={() => loginWithRedirect()}
          >
            Log In to Organization
          </button>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '24px' }}>
          Secure access restricted to authorized clinic personnel.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Component Structure
// ═══════════════════════════════════════════════════════
export default function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState(defaultSettings);
  
  // Historical Reports State
  const [reports, setReports] = useState([
    { id: 'REP-1049', date: 'Oct 24, 2023', patient: 'Patient #439', batch: 'EMB-094', count: 4, status: 'Completed' },
    { id: 'REP-1048', date: 'Oct 23, 2023', patient: 'Patient #421', batch: 'EMB-093', count: 6, status: 'Completed' },
    { id: 'REP-1047', date: 'Oct 20, 2023', patient: 'Patient #392', batch: 'EMB-092', count: 3, status: 'Pending Review' },
  ]);
  
  // Analysis State
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [insights, setInsights] = useState({});
  const [insightLoading, setInsightLoading] = useState({});
  const [error, setError] = useState(null);
  const [serverOk, setServerOk] = useState(null);

  const fileMapRef = useRef({});

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => setServerOk(d.status === 'ok'))
      .catch(() => setServerOk(false));
  }, []);

  const handleFilesSelected = useCallback((newFiles) => {
    setFiles((prev) => [...prev, ...newFiles]);
    const newPreviews = newFiles.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
    newFiles.forEach((f, i) => {
      fileMapRef.current[f.name] = newPreviews[i].url;
    });
  }, []);

  const handleRemove = useCallback((index) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
    setFiles((prev) => {
      const removed = prev[index];
      if (removed) delete fileMapRef.current[removed.name];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleClear = useCallback(() => {
    previews.forEach((p) => URL.revokeObjectURL(p.url));
    setPreviews([]);
    setFiles([]);
    setResults(null);
    setInsights({});
    setInsightLoading({});
    setError(null);
    fileMapRef.current = {};
  }, [previews]);

  const fetchInsights = useCallback(async (embryos, total) => {
    const calls = embryos.map(async (embryo) => {
      const key = embryo.filename;
      setInsightLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const insight = await fetchInsightFromBackend(embryo, total);
        setInsights((prev) => ({ ...prev, [key]: insight }));
      } catch (e) {
        console.error("Backend Insight API Error:", e);
        setInsights((prev) => ({ ...prev, [key]: null }));
      } finally {
        setInsightLoading((prev) => ({ ...prev, [key]: false }));
      }
    });
    await Promise.all(calls);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setInsights({});
    setInsightLoading({});

    try {
      let embryos;
      if (files.length === 1) {
        const formData = new FormData();
        formData.append('file', files[0]);
        const res = await fetch(`${API_BASE}/predict`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        embryos = [data];
        setResults({ mode: 'single', embryos: [data] });
      } else {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));
        const res = await fetch(`${API_BASE}/rank`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        embryos = data.ranked_embryos || [];
        setResults({ mode: 'rank', ...data, embryos });
      }

      // Generate a dynamic report entry
      const newReportId = `REP-${1050 + reports.length}`; // Simple incrementing ID logic for mock
      const newBatchRef = `EMB-${String(95 + reports.length).padStart(3, '0')}`;
      const newReport = {
        id: newReportId,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        patient: `Patient #${Math.floor(100 + Math.random() * 900)}`,
        batch: newBatchRef,
        count: embryos.length,
        status: 'Completed',
        embryos: embryos // attach the full array for the PDF!
      };
      setReports(prev => [newReport, ...prev]);

      fetchInsights(embryos, embryos.length);
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [files, fetchInsights]);

  const getPreviewUrl = (filename) => fileMapRef.current[filename] || null;
  const embryos = results?.embryos || [];

  if (isLoading || !isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="main-area">
        <Header serverOk={serverOk} clinicName={settings.clinicName} user={user} logout={logout} />

        <div className="content">
          {activeTab === 'dashboard' && <DashboardTab />}
          
          {activeTab === 'reports' && <ReportsTab reports={reports} settings={settings} />}
          
          {activeTab === 'settings' && (
            <SettingsTab settings={settings} onSettingsChange={setSettings} />
          )}

          {activeTab === 'analysis' && (
            <div className="tab-content">
              <div className="page-title-section">
                <h1 className="page-title">Embryo Analysis</h1>
                <p className="page-subtitle">
                  AI-powered embryo viability assessment and recommendation system
                </p>
              </div>

              <UploadZone
                files={files}
                previews={previews}
                onFilesSelected={handleFilesSelected}
                onRemove={handleRemove}
                onClear={handleClear}
                onAnalyze={handleAnalyze}
                loading={loading}
              />

              {loading && <LoadingState />}

              <ErrorBox error={error} />

              {!loading && embryos.length > 0 && (
                <>
                  {results?.mode === 'rank' && <SummaryRow embryos={embryos} />}

                  <div className="results-header-row">
                    <div className="results-header">Analysis Results</div>
                    <div className="results-count">
                      ({embryos.length} embryo{embryos.length !== 1 ? 's' : ''} analyzed)
                    </div>
                  </div>

                  <div className="results-grid">
                    {embryos.map((embryo, i) => (
                      <ResultCard
                        key={embryo.filename + i}
                        result={embryo}
                        rank={embryo.rank ?? i + 1}
                        total={embryos.length}
                        previewUrl={getPreviewUrl(embryo.filename)}
                        insight={insights[embryo.filename]}
                        insightLoading={insightLoading[embryo.filename] ?? false}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
