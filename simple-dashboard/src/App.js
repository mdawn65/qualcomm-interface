import React, { useState } from 'react';
import './App.css';
import PromptGenerator from './PromptGenerator';

function App() {
  const [selectedView, setSelectedView] = useState('Edge');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  
  const [edgeMetrics] = useState({
    networkLatency: 12,
    cost: 0.45,
    fidScore: 127.3
  });

  const [cloudMetrics] = useState({
    networkLatency: 8,
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

  const handleSubmitPrompt = () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setImageUrl(null);

    fetch('http://localhost:5000/generate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, num_steps: 20 })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to generate image');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      })
      .catch((err) => {
        console.error('Run error:', err);
        alert('Error generating image');
      })
      .finally(() => setLoading(false));
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
          <div className="info-container">
            <h3>{selectedView} Configuration</h3>
            <div className="info-details">
              <div className="info-item">
                <span className="info-label">Model:</span>
                <span className="info-value">{currentInfo.model}</span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {selectedView === 'Edge' ? 'Device:' : 'Service:'}
                </span>
                <span className="info-value">
                  {selectedView === 'Edge' ? currentInfo.device : currentInfo.service}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Quantization:</span>
                <span className="info-value">{currentInfo.quantization}</span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {selectedView === 'Edge' ? 'Memory:' : 'GPU:'}
                </span>
                <span className="info-value">
                  {selectedView === 'Edge' ? currentInfo.memory : currentInfo.gpu}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">
                  {selectedView === 'Edge' ? 'Storage:' : 'Region:'}
                </span>
                <span className="info-value">
                  {selectedView === 'Edge' ? currentInfo.storage : currentInfo.region}
                </span>
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
              <div className="metric-value">{currentMetrics.networkLatency}ms</div>
            </div>
            
            <div className="metric-card">
              <h3>Cost</h3>
              <div className="metric-value">${currentMetrics.cost}/hr</div>
            </div>
          </div>

          {/* Prompt Generator */}
          <PromptGenerator onGenerate={(p) => setPrompt(p)} />

          {/* Generate Button + Image Display */}
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleSubmitPrompt}
              className="submit-button"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Image'}
            </button>
          </div>

          {imageUrl && (
            <div style={{ marginTop: '20px' }}>
              <img
                src={imageUrl}
                alt="Generated"
                style={{ maxWidth: '100%', borderRadius: '8px' }}
              />
            </div>
          )}

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
                    <div className="bar edge-bar" style={{width: `${(edgeMetrics.networkLatency / 20) * 100}%`}}>
                      {edgeMetrics.networkLatency}ms
                    </div>
                  </div>
                  <div className="bar-wrapper">
                    <span className="bar-label">Cloud:</span>
                    <div className="bar cloud-bar" style={{width: `${(cloudMetrics.networkLatency / 20) * 100}%`}}>
                      {cloudMetrics.networkLatency}ms
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
                    <div className="bar edge-bar" style={{width: `${(edgeMetrics.cost / 1) * 100}%`}}>
                      ${edgeMetrics.cost}/hr
                    </div>
                  </div>
                  <div className="bar-wrapper">
                    <span className="bar-label">Cloud:</span>
                    <div className="bar cloud-bar" style={{width: `${(cloudMetrics.cost / 1) * 100}%`}}>
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
                    <div className="bar edge-bar" style={{width: `${(edgeMetrics.fidScore / 150) * 100}%`}}>
                      {edgeMetrics.fidScore}
                    </div>
                  </div>
                  <div className="bar-wrapper">
                    <span className="bar-label">Cloud:</span>
                    <div className="bar cloud-bar" style={{width: `${(cloudMetrics.fidScore / 150) * 100}%`}}>
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
