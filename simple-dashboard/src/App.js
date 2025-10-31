import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';

function App() {
  const [selectedView, setSelectedView] = useState('Edge');
  const [prompt, setPrompt] = useState('');
  
  const [edgeMetrics] = useState({
    networkLatency: 12,
    cost: '$0.45/hr',
    fidScore: 127.3
  });

  const [cloudMetrics] = useState({
    networkLatency: 8,
    cost: '$0.78/hr',
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
  const currentInfo = selectedView === 'Edge' ? edgeInfo : cloudInfo;
  const currentChartData = selectedView === 'Edge' ? edgeChartData : cloudChartData;

  const handleViewChange = (event) => {
    setSelectedView(event.target.value);
  };

  const handlePromptChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSubmitPrompt = () => {
    console.log('Submitted prompt:', prompt);
    // Here you would typically send the prompt to your backend
    alert(`Prompt submitted: ${prompt}`);
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
          <div className="metrics-grid-small">
            <div className="metric-card">
              <h3>Latency</h3>
              <div className="metric-value">{currentMetrics.networkLatency}ms</div>
            </div>
            
            <div className="metric-card">
              <h3>Cost</h3>
              <div className="metric-value">{currentMetrics.cost}</div>
            </div>
          </div>
          
          <div className="prompt-container">
            <h3>Enter Your Prompt Into the Stable Diffusion Model</h3>
            <textarea
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Type your prompt here..."
              className="prompt-input"
              rows="4"
            />
            <button onClick={handleSubmitPrompt} className="submit-button">
              Submit Prompt
            </button>
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
