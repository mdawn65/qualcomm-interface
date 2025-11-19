import React, { useState, useCallback } from 'react';
import './App.css';
import PromptGenerator from './PromptGenerator';

function App() {
  const [selectedView, setSelectedView] = useState('Edge');

  const [edgeMetrics, setEdgeMetrics] = useState({
    networkLatency: 0,
    cost: 0,
    fidScore: 0
  });

  const [cloudMetrics, setCloudMetrics] = useState({
    networkLatency: 0,
    cost: 0.78,
    fidScore: 89.7
  });

  const [edgeInfo] = useState({
    model: 'Stable Diffusion V2.1',
    device: 'Qualcomm Snapdragon X Elite',
    quantization: 'w816a',
    memory: '32GB',
    storage: '475GB'
  });

  const [cloudInfo] = useState({
    model: 'Stable Diffusion V2.1',
    service: 'AWS EC2 g4dn.xlarge',
    quantization: 'FP32 - 13.5GB',
    gpu: 'NVIDIA T4 16GB',
    region: 'us-west-2'
  });

  const currentMetrics = selectedView === 'Edge' ? edgeMetrics : cloudMetrics;
  const currentInfo = selectedView === 'Edge' ? edgeInfo : cloudInfo;

  const handleViewChange = (event) => setSelectedView(event.target.value);

  // Stable callback for latency calculation
  const handleLatencyCalculated = useCallback((latencyInSeconds, view) => {
    console.log('[App] ========== LATENCY CALCULATED ==========');
    console.log('[App] Latency:', latencyInSeconds, 'seconds');
    console.log('[App] View:', view);
    
    if (view === 'Edge') {
      setEdgeMetrics((prev) => {
        const updated = { ...prev, networkLatency: latencyInSeconds };
        console.log('[App] Updated Edge metrics:', updated);
        return updated;
      });
    } else {
      setCloudMetrics((prev) => {
        const updated = { ...prev, networkLatency: latencyInSeconds };
        console.log('[App] Updated Cloud metrics:', updated);
        return updated;
      });
    }
  }, []);

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
          <div className="info-container">
            <h3>{selectedView} Configuration</h3>
            <div className="info-details">
              <div className="info-item">
                <span className="info-label">Model:</span>
                <span className="info-value">{currentInfo.model}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{selectedView === 'Edge' ? 'Device:' : 'Service:'}</span>
                <span className="info-value">{selectedView === 'Edge' ? currentInfo.device : currentInfo.service}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Quantization:</span>
                <span className="info-value">{currentInfo.quantization}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{selectedView === 'Edge' ? 'Memory:' : 'GPU:'}</span>
                <span className="info-value">{selectedView === 'Edge' ? currentInfo.memory : currentInfo.gpu}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{selectedView === 'Edge' ? 'Storage:' : 'Region:'}</span>
                <span className="info-value">{selectedView === 'Edge' ? currentInfo.storage : currentInfo.region}</span>
              </div>
            </div>
          </div>

          <div className="fid-score-card">
            <h3>FID Score</h3>
            <div className="metric-value">{currentMetrics.fidScore}</div>
          </div>
        </div>

        <div className="right-section">
          <div className="metrics-grid-small">
            <div className="metric-card">
              <h3>Latency</h3>
              <div className="metric-value">{currentMetrics.networkLatency.toFixed(2)}s</div>
            </div>

            <div className="metric-card">
              <h3>Cost</h3>
              <div className="metric-value">${currentMetrics.cost}/hr</div>
            </div>
          </div>

          {/* Prompt Generator */}
          <PromptGenerator 
            selectedView={selectedView}
            onLatencyCalculated={handleLatencyCalculated}
          />

          {/* Comparison Charts */}
          <div className="chart-container">
            <h2>Edge vs Cloud Comparison</h2>
            <div className="comparison-bars">
              {/* Latency */}
              <div className="comparison-item">
                <h4>Latency (lower is better)</h4>
                <div className="bar-container">
                  <div className="bar-wrapper">
                    <span className="bar-label">Edge:</span>
                    <div
                      className="bar edge-bar"
                      style={{ width: `${(edgeMetrics.networkLatency / 20) * 100}%` }}
                    >
                      {edgeMetrics.networkLatency.toFixed(2)}s
                    </div>
                  </div>
                  <div className="bar-wrapper">
                    <span className="bar-label">Cloud:</span>
                    <div
                      className="bar cloud-bar"
                      style={{ width: `${(cloudMetrics.networkLatency / 20) * 100}%` }}
                    >
                      {cloudMetrics.networkLatency.toFixed(2)}s
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost */}
              <div className="comparison-item">
                <h4>Cost per Hour (lower is better)</h4>
                <div className="bar-container">
                  <div className="bar-wrapper">
                    <span className="bar-label">Edge:</span>
                    <div
                      className="bar edge-bar"
                      style={{ width: `${(edgeMetrics.cost / 1) * 100}%` }}
                    >
                      ${edgeMetrics.cost}/hr
                    </div>
                  </div>
                  <div className="bar-wrapper">
                    <span className="bar-label">Cloud:</span>
                    <div
                      className="bar cloud-bar"
                      style={{ width: `${(cloudMetrics.cost / 1) * 100}%` }}
                    >
                      ${cloudMetrics.cost}/hr
                    </div>
                  </div>
                </div>
              </div>

              {/* FID Score */}
              <div className="comparison-item">
                <h4>FID Score (lower is better)</h4>
                <div className="bar-container">
                  <div className="bar-wrapper">
                    <span className="bar-label">Edge:</span>
                    <div
                      className="bar edge-bar"
                      style={{ width: `${(edgeMetrics.fidScore / 150) * 100}%` }}
                    >
                      {edgeMetrics.fidScore}
                    </div>
                  </div>
                  <div className="bar-wrapper">
                    <span className="bar-label">Cloud:</span>
                    <div
                      className="bar cloud-bar"
                      style={{ width: `${(cloudMetrics.fidScore / 150) * 100}%` }}
                    >
                      {cloudMetrics.fidScore}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
