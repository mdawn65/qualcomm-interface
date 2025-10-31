import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [selectedView, setSelectedView] = useState('Edge');
  
  const [edgeMetrics] = useState({
    cpuUsage: 45,
    memoryUsage: 67,
    networkLatency: 12,
    activeConnections: 156,
    throughput: '2.3 Gbps',
    temperature: '42°C',
    fidScore: 127.3
  });

  const [cloudMetrics] = useState({
    cpuUsage: 32,
    memoryUsage: 54,
    networkLatency: 8,
    activeConnections: 234,
    throughput: '5.7 Gbps',
    temperature: '38°C',
    fidScore: 89.7
  });

  const edgeChartData = [
    { name: '1h ago', value: 30 },
    { name: '45m ago', value: 45 },
    { name: '30m ago', value: 35 },
    { name: '15m ago', value: 50 },
    { name: 'now', value: 45 }
  ];

  const cloudChartData = [
    { name: '1h ago', value: 25 },
    { name: '45m ago', value: 32 },
    { name: '30m ago', value: 28 },
    { name: '15m ago', value: 35 },
    { name: 'now', value: 32 }
  ];

  const currentMetrics = selectedView === 'Edge' ? edgeMetrics : cloudMetrics;
  const currentChartData = selectedView === 'Edge' ? edgeChartData : cloudChartData;

  const handleViewChange = (event) => {
    setSelectedView(event.target.value);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>Qualcomm {selectedView} Metrics Dashboard</h1>
        <div className="dropdown-container">
          <label htmlFor="view-select">View: </label>
          <select 
            id="view-select" 
            value={selectedView} 
            onChange={handleViewChange}
            className="view-dropdown"
          >
            <option value="Edge">Edge</option>
            <option value="Cloud">Cloud</option>
          </select>
        </div>
      </header>
      
      <div className="main-content">
        <div className="left-section">
          <div className="image-container">
            <div className="mock-image">
              <p>{selectedView} Infrastructure</p>
              <p>📊</p>
            </div>
          </div>
          
          <div className="fid-score-card">
            <h3>FID Score</h3>
            <div className="metric-value">{currentMetrics.fidScore}</div>
          </div>
        </div>
        
        <div className="right-section">
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>CPU Usage</h3>
              <div className="metric-value">{currentMetrics.cpuUsage}%</div>
            </div>
            
            <div className="metric-card">
              <h3>Memory Usage</h3>
              <div className="metric-value">{currentMetrics.memoryUsage}%</div>
            </div>
            
            <div className="metric-card">
              <h3>Network Latency</h3>
              <div className="metric-value">{currentMetrics.networkLatency}ms</div>
            </div>
            
            <div className="metric-card">
              <h3>Active Connections</h3>
              <div className="metric-value">{currentMetrics.activeConnections}</div>
            </div>
            
            <div className="metric-card">
              <h3>Throughput</h3>
              <div className="metric-value">{currentMetrics.throughput}</div>
            </div>
            
            <div className="metric-card">
              <h3>Temperature</h3>
              <div className="metric-value">{currentMetrics.temperature}</div>
            </div>
          </div>
          
          <div className="chart-container">
            <h2>{selectedView} Performance Over Time</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={currentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#007bff" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
