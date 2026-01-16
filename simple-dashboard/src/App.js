import React, { useState, useCallback } from 'react';
import './App.css';
import PromptGenerator from './PromptGenerator';

const COST_PER_INFERENCE_INCREMENT = 0.00003836;

const INITIAL_EDGE_METRICS = {
  networkLatency: 0,
  cost: 0,
  totalCost: 0,
  costPerGeneration: 0,
  costPerInference: 0,
  imagesGenerated: 0,
};

const INITIAL_CLOUD_METRICS = {
  networkLatency: 0,
  cost: 0.138,
  totalCost: 0,
  costPerGeneration: 0,
  costPerInference: 0,
  imagesGenerated: 0,
};

function App() {
  const [selectedView, setSelectedView] = useState('Edge');

  const [edgeMetrics, setEdgeMetrics] = useState(() => {
    let imagesGenerated = 0;
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('edgeImagesGenerated');
      const parsed = stored !== null ? parseInt(stored, 10) : 0;
      imagesGenerated = Number.isNaN(parsed) ? 0 : parsed;
    }
    return {
      ...INITIAL_EDGE_METRICS,
      imagesGenerated,
    };
  });

  const [cloudMetrics, setCloudMetrics] = useState(() => {
    let imagesGenerated = 0;
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('cloudImagesGenerated');
      const parsed = stored !== null ? parseInt(stored, 10) : 0;
      imagesGenerated = Number.isNaN(parsed) ? 0 : parsed;
    }

    const baseCostPerInference = imagesGenerated * INITIAL_CLOUD_METRICS.cost;

    return {
      ...INITIAL_CLOUD_METRICS,
      imagesGenerated,
      costPerInference: baseCostPerInference,
    };
  });

  const [edgeInfo] = useState({
    model: 'Stable Diffusion V2.1',
    device: 'Qualcomm Snapdragon X Elite',
    quantization: 'w8a16',
    memory: '32GB',
    storage: '475GB'
  });

  const [cloudInfo] = useState({
    model: 'Stable Diffusion V2.1',
    service: 'Verda Cloud Platform',
    quantization: 'w8a16',
    gpu: '1X Tesla V100',
    region: 'FIN-01'
  });

  const currentMetrics = selectedView === 'Edge' ? edgeMetrics : cloudMetrics;
  const currentInfo = selectedView === 'Edge' ? edgeInfo : cloudInfo;

  const handleViewChange = (eventOrValue) => {
    if (typeof eventOrValue === 'string') {
      setSelectedView(eventOrValue);
    } else if (eventOrValue && eventOrValue.target) {
      setSelectedView(eventOrValue.target.value);
    }
  };

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

  // Increment cost per inference using per-image generation time (seconds)
  const handleInferenceCostIncrement = useCallback((view, imageSeconds) => {
    console.log('[App] ========== INFERENCE COST INCREMENT ==========');
    console.log('[App] View:', view);
    console.log('[App] Image seconds:', imageSeconds);

    // Edge view: do not change Cost Per Inference (stays at 0)
    if (view === 'Edge') {
      return;
    }

    setCloudMetrics((prev) => {
      const updated = {
        ...prev,
        costPerInference:
          prev.costPerInference + (COST_PER_INFERENCE_INCREMENT * (imageSeconds || 0)),
      };
      console.log('[App] Updated Cloud metrics (Cost Per Inference):', updated);
      return updated;
    });
  }, []);

  // Increment images generated count for the active view
  const handleImageGenerated = useCallback((view) => {
    console.log('[App] ========== IMAGE GENERATED ==========');
    console.log('[App] View:', view);

    if (view === 'Edge') {
      setEdgeMetrics((prev) => {
        const updated = {
          ...prev,
          imagesGenerated: prev.imagesGenerated + 1,
        };
        console.log('[App] Updated Edge metrics (Images Generated):', updated);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('edgeImagesGenerated', String(updated.imagesGenerated));
        }
        return updated;
      });
    } else {
      setCloudMetrics((prev) => {
        const updated = {
          ...prev,
          imagesGenerated: prev.imagesGenerated + 1,
        };
        console.log('[App] Updated Cloud metrics (Images Generated):', updated);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('cloudImagesGenerated', String(updated.imagesGenerated));
        }
        return updated;
      });
    }
  }, []);

  // Stable callback for cost calculation
  const handleCostCalculated = useCallback((totalCost, costPerGeneration, view) => {
    console.log('[App] ========== COST CALCULATED ==========');
    console.log('[App] Total Cost:', totalCost);
    console.log('[App] Cost Per Generation:', costPerGeneration);
    console.log('[App] View:', view);

    if (view === 'Edge') {
      setEdgeMetrics((prev) => {
        const updated = { ...prev, totalCost, costPerGeneration, costPerInference: 0 };
        console.log('[App] Updated Edge metrics (Cost):', updated);
        return updated;
      });
    } else {
      setCloudMetrics((prev) => {
        const updated = {
          ...prev,
          totalCost,
          costPerGeneration,
        };
        console.log('[App] Updated Cloud metrics (Cost):', updated);
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

          {/* Latency and Cost metrics moved under configuration */}
          <div className="metrics-grid-small">
            <div className="metric-card">
              <h3>Latency</h3>
              <div className="metric-value">{currentMetrics.networkLatency.toFixed(2)}s</div>
            </div>

            <div className="metric-card">
              <h3>Images Generated</h3>
              <div className="metric-value">{currentMetrics.imagesGenerated}</div>
            </div>
            <div className="metric-card">
              <h3>Cost</h3>
              <div className="metric-value">${currentMetrics.cost}/hr</div>
              {selectedView !== 'Edge' && currentMetrics.totalCost > 0}
               {/* && (
                <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
                  <div>Total: ${currentMetrics.totalCost.toFixed(4)}</div>
                  <div>Per Gen: ${currentMetrics.costPerGeneration.toFixed(4)}</div>
                </div>
              )} */}
            </div>

            <div className="metric-card">
              <h3>Cost Per Image</h3> 
              {/* Was previously cost per inference */}
              <div className="metric-value">${currentMetrics.costPerInference.toFixed(6)}/Inf</div>
            </div>
          </div>
        </div>

        <div className="right-section">
          {/* Prompt Generator moved to top of right section */}
          <PromptGenerator 
            selectedView={selectedView}
            costPerHour={currentMetrics.cost}
            onLatencyCalculated={handleLatencyCalculated}
            onCostCalculated={handleCostCalculated}
            onInferenceCostIncrement={handleInferenceCostIncrement}
            onImageGenerated={handleImageGenerated}
            onViewChange={handleViewChange}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;