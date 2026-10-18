import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Dashboard() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🏥 NearHelp Admin</h1>
      <p>Admin dashboard — coming in Milestone 10</p>
      <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>System Status</h3>
        <p>✅ Admin panel is running</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
