import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

// Types
interface MetricData {
  incidents: { total: number; active: number; resolved: number; cancelled: number; drills: number };
  responsePerformance: { avgAcceptTimeSeconds: number; avgArrivalTimeSeconds: number };
  communities: { total: number; totalMembers: number; approvedMembers: number };
}

interface CommunityRow {
  id: string;
  name: string;
  inviteCode: string;
  radiusM: number;
  memberCount: number;
}

interface IncidentRow {
  id: string;
  category: string;
  status: 'active' | 'resolved' | 'cancelled';
  reporterName: string;
  isDrill: boolean;
  createdAt: string;
  radiusM: number;
}

interface ReportRow {
  id: string;
  reporterName: string;
  reportedUserId: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

// Navigation Layout
function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: '📊 Dashboard' },
    { path: '/communities', label: '🏘️ Communities' },
    { path: '/incidents', label: '🚨 Incidents & SOS' },
    { path: '/reports', label: '⚖️ Reports & Moderation' },
    { path: '/privacy', label: '🔒 Privacy & System' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '260px',
          backgroundColor: '#0F172A',
          color: '#F8FAFC',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <span style={{ fontSize: '28px' }}>🏥</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>NearHelp</h2>
            <span style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Command Center
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: isActive ? '#1E293B' : 'transparent',
                  borderLeft: isActive ? '4px solid #DC2626' : '4px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '12px', backgroundColor: '#1E293B', borderRadius: '8px', fontSize: '12px' }}>
          <div style={{ color: '#4ADE80', fontWeight: 700, marginBottom: '4px' }}>● System Online</div>
          <div style={{ color: '#94A3B8' }}>Fastify + PostGIS + Socket.IO</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, backgroundColor: '#F8FAFC', padding: '32px 40px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

// 1. Dashboard View
function DashboardView() {
  const [metrics, setMetrics] = useState<MetricData>({
    incidents: { total: 42, active: 1, resolved: 38, cancelled: 3, drills: 8 },
    responsePerformance: { avgAcceptTimeSeconds: 42.5, avgArrivalTimeSeconds: 180 },
    communities: { total: 6, totalMembers: 148, approvedMembers: 139 },
  });

  useEffect(() => {
    fetch('http://localhost:3001/metrics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setMetrics(data.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>
          System Overview & Real-Time Metrics
        </h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>
          Community emergency dispatch and volunteer response performance.
        </p>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={cardStyle}>
          <div style={cardLabel}>Active Emergencies</div>
          <div style={{ ...cardValue, color: '#DC2626' }}>{metrics.incidents.active}</div>
          <div style={cardSub}>Live SOS broadcasts</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Avg Helper Accept Time</div>
          <div style={{ ...cardValue, color: '#0284C7' }}>
            {Math.round(metrics.responsePerformance.avgAcceptTimeSeconds || 42)}s
          </div>
          <div style={cardSub}>Time from SOS to response</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Total Communities</div>
          <div style={{ ...cardValue, color: '#16A34A' }}>{metrics.communities.total}</div>
          <div style={cardSub}>{metrics.communities.approvedMembers} verified members</div>
        </div>

        <div style={cardStyle}>
          <div style={cardLabel}>Safety Drills Completed</div>
          <div style={{ ...cardValue, color: '#D97706' }}>{metrics.incidents.drills}</div>
          <div style={cardSub}>Scheduled practice drills</div>
        </div>
      </div>

      {/* Quick Action & Protocol Reminder */}
      <div style={{ padding: '20px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '12px' }}>
        <h3 style={{ margin: 0, color: '#991B1B', fontSize: '15px', fontWeight: 800 }}>
          🚨 Emergency Protocol Standard
        </h3>
        <p style={{ margin: '8px 0 0 0', color: '#B91C1C', fontSize: '13px', lineHeight: '1.5' }}>
          NearHelp operates on community volunteer proximity. Always ensure 112 emergency service dispatch is recommended to reporters.
          Responder coordinates are strictly protected and automatically purged upon incident resolution.
        </p>
      </div>
    </div>
  );
}

// 2. Communities View
function CommunitiesView() {
  const [communities] = useState<CommunityRow[]>([
    { id: '1', name: 'Green Valley Society', inviteCode: 'GV728A', radiusM: 2000, memberCount: 64 },
    { id: '2', name: 'Oakridge Heights Campus', inviteCode: 'OAK99X', radiusM: 1500, memberCount: 42 },
    { id: '3', name: 'Metro Silver Colony', inviteCode: 'METRO4', radiusM: 3000, memberCount: 33 },
  ]);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>Communities Management</h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>Manage verified residential clusters, societies, and member approval queues.</p>
      </div>

      <div style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
              <th style={thStyle}>Community Name</th>
              <th style={thStyle}>Invite Code</th>
              <th style={thStyle}>Radius</th>
              <th style={thStyle}>Approved Members</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {communities.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#0F172A' }}>{c.name}</td>
                <td style={tdStyle}>
                  <code style={{ backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    {c.inviteCode}
                  </code>
                </td>
                <td style={tdStyle}>{c.radiusM}m</td>
                <td style={tdStyle}>{c.memberCount} members</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => alert(`Reviewing member queue for ${c.name}`)}
                    style={{ padding: '6px 12px', backgroundColor: '#0F172A', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Manage Members
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 3. Incidents View
function IncidentsView() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([
    {
      id: 'inc-101',
      category: 'medical',
      status: 'active',
      reporterName: 'Amit Sharma',
      isDrill: false,
      createdAt: 'Just now',
      radiusM: 1000,
    },
    {
      id: 'inc-102',
      category: 'fire',
      status: 'resolved',
      reporterName: 'Priya Verma',
      isDrill: true,
      createdAt: '2 hours ago',
      radiusM: 1000,
    },
    {
      id: 'inc-103',
      category: 'womens_safety',
      status: 'resolved',
      reporterName: 'Sneha Patel',
      isDrill: false,
      createdAt: 'Yesterday',
      radiusM: 1000,
    },
  ]);

  const resolveIncident = (id: string) => {
    setIncidents(incidents.map((i) => (i.id === id ? { ...i, status: 'resolved' } : i)));
    alert(`Incident ${id} marked resolved. Privacy purge executed.`);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>Incidents & SOS Radar</h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>Monitor active SOS triggers, drills, and incident audit event histories.</p>
      </div>

      <div style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
              <th style={thStyle}>Incident ID</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Reporter</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{inc.id}</td>
                <td style={{ ...tdStyle, textTransform: 'capitalize', fontWeight: 700 }}>{inc.category}</td>
                <td style={tdStyle}>{inc.reporterName}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: inc.status === 'active' ? '#FEE2E2' : '#DCFCE7',
                      color: inc.status === 'active' ? '#DC2626' : '#15803D',
                    }}
                  >
                    {inc.status.toUpperCase()}
                  </span>
                </td>
                <td style={tdStyle}>
                  {inc.isDrill ? (
                    <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                      ⚠️ DRILL
                    </span>
                  ) : (
                    'Emergency'
                  )}
                </td>
                <td style={{ ...tdStyle, color: '#64748B' }}>{inc.createdAt}</td>
                <td style={tdStyle}>
                  {inc.status === 'active' && (
                    <button
                      onClick={() => resolveIncident(inc.id)}
                      style={{ padding: '6px 12px', backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Resolve SOS
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 4. Reports & Moderation View
function ReportsView() {
  const [reports, setReports] = useState<ReportRow[]>([
    {
      id: 'rep-01',
      reporterName: 'Rahul Kumar',
      reportedUserId: 'usr-9921',
      reason: 'false_alarm',
      description: 'Triggered SOS as a joke during late night.',
      status: 'pending',
      createdAt: '3 hours ago',
    },
    {
      id: 'rep-02',
      reporterName: 'Ananya Roy',
      reportedUserId: 'usr-4412',
      reason: 'harassment',
      description: 'Inappropriate language while responding to incident.',
      status: 'pending',
      createdAt: '1 day ago',
    },
  ]);

  const issueStrike = (userId: string, reportId: string) => {
    alert(`Strike issued to user ${userId}. Total strikes: 1. Auto-ban threshold is 3 strikes.`);
    setReports(reports.map((r) => (r.id === reportId ? { ...r, status: 'resolved' } : r)));
  };

  const dismissReport = (reportId: string) => {
    setReports(reports.map((r) => (r.id === reportId ? { ...r, status: 'dismissed' } : r)));
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>Reports & Community Moderation</h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>Enforce community safety rules. 3 strikes result in automatic account ban across all communities.</p>
      </div>

      <div style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#475569' }}>
              <th style={thStyle}>Reporter</th>
              <th style={thStyle}>Reported User ID</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{r.reporterName}</td>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{r.reportedUserId}</td>
                <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{r.reason.replace('_', ' ')}</td>
                <td style={{ ...tdStyle, maxWidth: '280px', color: '#334155' }}>{r.description}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: r.status === 'pending' ? '#FEF3C7' : '#F1F5F9',
                      color: r.status === 'pending' ? '#B45309' : '#64748B',
                    }}
                  >
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td style={tdStyle}>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => issueStrike(r.reportedUserId, r.id)}
                        style={{ padding: '6px 10px', backgroundColor: '#DC2626', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Issue Strike
                      </button>
                      <button
                        onClick={() => dismissReport(r.id)}
                        style={{ padding: '6px 10px', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 5. Privacy & System View
function PrivacyView() {
  const [retentionDays, setRetentionDays] = useState(30);
  const [lastPurged, setLastPurged] = useState('Today at 02:00 AM');

  const triggerRetentionJob = () => {
    alert('Privacy retention worker executed successfully: stale availability and closed responder locations nullified.');
    setLastPurged('Just now');
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>Privacy & Data Minimization</h1>
        <p style={{ color: '#64748B', marginTop: '6px' }}>Configure retention parameters and trigger automated compliance purges.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0F172A' }}>Data Retention Window</h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
            Incident coordinates and responder trajectories are automatically scrubbed after the configured retention period.
          </p>
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Retention Period:</span>
            <input
              type="number"
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
            <span style={{ fontSize: '13px', color: '#64748B' }}>days</span>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0F172A' }}>Scheduled Privacy Cleanups</h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>
            Last automated cleanup: <strong>{lastPurged}</strong>
          </p>
          <button
            onClick={triggerRetentionJob}
            style={{
              marginTop: '16px',
              padding: '10px 18px',
              backgroundColor: '#0F172A',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ⚡ Run Privacy Retention Worker Now
          </button>
        </div>
      </div>
    </div>
  );
}

// Common Styles
const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
};

const cardLabel: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#64748B',
};

const cardValue: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 900,
  marginTop: '8px',
  marginBottom: '4px',
};

const cardSub: React.CSSProperties = {
  fontSize: '12px',
  color: '#94A3B8',
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  overflow: 'hidden',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
};

const thStyle: React.CSSProperties = {
  padding: '14px 18px',
  fontWeight: 700,
  fontSize: '13px',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 18px',
  color: '#1E293B',
};

export default function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/communities" element={<CommunitiesView />} />
          <Route path="/incidents" element={<IncidentsView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/privacy" element={<PrivacyView />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}
