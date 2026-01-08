import React, { useState } from "react";
import "./App.css";

const CLOUD_GPU_URL = "http://65.109.75.37:8001"; // Verda cloud Stable Diffusion server

const PromptGenerator = ({ selectedView, costPerHour, onLatencyCalculated, onCostCalculated, onClipCalculated, onInferenceCostIncrement }) => {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [numSeeds, setNumSeeds] = useState(1);
  const [numGuidanceSamples, setNumGuidanceSamples] = useState(1);
  const [guidanceScaleMin, setGuidanceScaleMin] = useState(7.5);
  const [guidanceScaleMax, setGuidanceScaleMax] = useState(7.5);
  const [numSteps, setNumSteps] = useState(20);
  const [computeClipScore, setComputeClipScore] = useState(false);
  const [imageGrid, setImageGrid] = useState({});
  const [loading, setLoading] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [averageLatency, setAverageLatency] = useState(null);
  const [totalLatency, setTotalLatency] = useState(null);
  
  const totalImages = numSeeds * numGuidanceSamples;

  // Calculate guidance scale values for the grid
  const getGuidanceScaleValues = () => {
    if (numGuidanceSamples === 1) return [Math.round(guidanceScaleMin * 2) / 2];
    const values = [];
    const step = (guidanceScaleMax - guidanceScaleMin) / (numGuidanceSamples - 1);
    for (let i = 0; i < numGuidanceSamples; i++) {
      const value = guidanceScaleMin + step * i;
      // Round to nearest 0.5
      values.push(Math.round(value * 2) / 2);
    }
    return values;
  };

  const generateImage = async () => {
    if (!prompt.trim()) return;
    console.log('[PromptGenerator] Generate button clicked');

    if (onInferenceCostIncrement) {
      try {
        const imageCount = totalImages;
        console.log('[PromptGenerator] Incrementing Cost Per Inference for view:', selectedView, 'imageCount:', imageCount);
        onInferenceCostIncrement(selectedView, imageCount);
      } catch (err) {
        console.error('[PromptGenerator] Error incrementing Cost Per Inference:', err);
      }
    }

    setLoading(true);
    setAverageLatency(null);
    setTotalLatency(null);
    
    // Generate random seeds for each seed index
    const randomSeeds = Array.from({ length: numSeeds }, () => 
      Math.floor(Math.random() * 2147483647)
    );
    
    // Initialize grid with loading states
    const initialGrid = {};
    for (let seed = 0; seed < numSeeds; seed++) {
      for (let guidance = 0; guidance < numGuidanceSamples; guidance++) {
        initialGrid[`${seed}-${guidance}`] = { 
          loading: true, 
          imageUrl: null, 
          clipScore: null,
          clipComputationTime: null,
          generationTime: null,
          seed: randomSeeds[seed],
          guidanceScale: null
        };
      }
    }
    setImageGrid(initialGrid);

    try {
      if (selectedView === 'Edge') {
        console.log('[PromptGenerator] [Edge] Starting image generation...');
        const response = await fetch("http://localhost:5000/generate/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            negative_prompt: negativePrompt,
            num_steps: numSteps,
            num_seeds: numSeeds,
            num_guidance_samples: numGuidanceSamples,
            guidance_scale_min: guidanceScaleMin,
            guidance_scale_max: guidanceScaleMax,
            compute_clip_score: computeClipScore,
            seeds: randomSeeds
          })
        });

        if (!response.ok) {
          throw new Error("Failed to generate image");
        }

        // Handle streaming responses
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'image') {
                  const key = `${data.seed_index}-${data.guidance_index}`;
                  const url = `data:image/png;base64,${data.imageBase64}`;
                  
                  setImageGrid(prev => ({
                    ...prev,
                    [key]: {
                      loading: false,
                      imageUrl: url,
                      clipScore: data.clipScore || null,
                      clipComputationTime: data.clipComputationTime || null,
                      generationTime: data.generationTime || null,
                      seed: data.seed || null,
                      guidanceScale: data.guidance_scale || null
                    }
                  }));
                } else if (data.type === 'complete') {
                  console.log('[PromptGenerator] [Edge] Generation complete');
                  if (typeof data.totalLatency === 'number') {
                    setTotalLatency(data.totalLatency);
                    if (onLatencyCalculated) {
                      onLatencyCalculated(data.totalLatency, selectedView);
                    }
                  }
                  if (typeof data.averageLatency === 'number') {
                    setAverageLatency(data.averageLatency);
                  }
                }
              } catch (e) {
                console.error('Error parsing JSON:', e);
              }
            }
          }
        }

        setLoading(false);
      } else {
        console.log('[PromptGenerator] [Cloud] Starting image generation...');

        const response = await fetch(`${CLOUD_GPU_URL}/generate`, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            num_steps: numSteps,
            num_seeds: numSeeds,
            num_guidance_samples: numGuidanceSamples,
            guidance_scale_min: guidanceScaleMin,
            guidance_scale_max: guidanceScaleMax,
            seeds: randomSeeds,
            width: 512,
            height: 512,
            compute_clip_score: computeClipScore
          })
        });

        if (!response.ok) {
          throw new Error("Failed to generate image");
        }

        // Handle streaming responses (SSE) from cloud_server
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'image') {
                  const key = `${data.seed_index}-${data.guidance_index}`;
                  const url = `data:image/png;base64,${data.imageBase64}`;
                  
                  setImageGrid(prev => ({
                    ...prev,
                    [key]: {
                      loading: false,
                      imageUrl: url,
                      clipScore: data.clipScore || null,
                      clipComputationTime: data.clipComputationTime || null,
                      generationTime: data.generationTime || null,
                      seed: data.seed || null,
                      guidanceScale: data.guidance_scale || null
                    }
                  }));
                } else if (data.type === 'complete') {
                  console.log('[PromptGenerator] [Cloud] Generation complete');
                  if (typeof data.totalLatency === 'number') {
                    setTotalLatency(data.totalLatency);
                    if (onLatencyCalculated) {
                      onLatencyCalculated(data.totalLatency, selectedView);
                    }
                    
                    // Calculate cost for Cloud view only
                    if (selectedView !== 'Edge' && costPerHour && onCostCalculated) {
                      const costPerSecond = costPerHour / 3600;
                      const totalCost = costPerSecond * data.totalLatency;
                      const costPerGeneration = totalCost / totalImages;
                      
                      console.log('[PromptGenerator] [Cloud] Cost calculation:');
                      console.log('  Cost per hour:', costPerHour);
                      console.log('  Cost per second:', costPerSecond);
                      console.log('  Total latency:', data.totalLatency);
                      console.log('  Total images:', totalImages);
                      console.log('  Total cost:', totalCost);
                      console.log('  Cost per generation:', costPerGeneration);
                      
                      onCostCalculated(totalCost, costPerGeneration, selectedView);
                    }
                  }
                  if (typeof data.averageLatency === 'number') {
                    setAverageLatency(data.averageLatency);
                  }
                }
              } catch (e) {
                console.error('Error parsing JSON:', e);
              }
            }
          }
        }

        setLoading(false);
      }
    } catch (error) {
      console.error('[PromptGenerator] Error:', error);
      alert("Error generating image.");
      setLoading(false);
      setImageGrid({});
    }
  };

  const guidanceScaleValues = getGuidanceScaleValues();

  return (
    <div className="prompt-container">
      <h3>Image Generator</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="prompt-input"
          style={{ 
            width: '100%',
            marginBottom: '10px',
            minHeight: 'auto',
            height: 'auto'
          }}
        />
        
        <input
          type="text"
          value={negativePrompt}
          onChange={e => setNegativePrompt(e.target.value)}
          placeholder="Negative prompt (optional)..."
          className="prompt-input"
          style={{ 
            width: '100%',
            marginBottom: '10px',
            minHeight: 'auto',
            height: 'auto'
          }}
        />
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          marginBottom: '10px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
              Number of Seeds
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={numSeeds}
              onChange={e => setNumSeeds(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ 
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
              Guidance Scale Samples
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={numGuidanceSamples}
              onChange={e => setNumGuidanceSamples(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ 
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
              Guidance Scale Min
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={guidanceScaleMin}
              onChange={e => setGuidanceScaleMin(parseFloat(e.target.value) || 0)}
              style={{ 
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
              Guidance Scale Max
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="20"
              value={guidanceScaleMax}
              onChange={e => setGuidanceScaleMax(parseFloat(e.target.value) || 0)}
              style={{ 
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
              Number of Steps
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={numSteps}
              onChange={e => setNumSteps(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ 
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
          padding: '10px',
          background: '#f8f9fa',
          borderRadius: '4px'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
            <input
              type="checkbox"
              checked={computeClipScore}
              onChange={e => setComputeClipScore(e.target.checked)}
              style={{ 
                marginRight: '8px',
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }}
            />
            Compute CLIP Score
          </label>
        </div>
        
        <div style={{
          padding: '10px',
          background: '#e3f2fd',
          borderRadius: '4px',
          marginBottom: '10px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#1976d2'
        }}>
          Total images to be generated: {totalImages}
        </div>
        
        <button
          onClick={generateImage}
          className="submit-button"
          disabled={loading || !prompt.trim()}
          style={{ 
            width: '100%',
            opacity: (loading || !prompt.trim()) ? 0.6 : 1,
            cursor: (loading || !prompt.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Image Grid Display */}
      {Object.keys(imageGrid).length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '15px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h4 style={{ margin: 0 }}>Generated Images</h4>
            
            {(totalLatency !== null || averageLatency !== null) && (
              <div style={{ 
                display: 'flex', 
                gap: '15px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {averageLatency !== null && (
                  <div style={{
                    padding: '10px 16px',
                    background: '#e3f2fd',
                    borderRadius: '6px',
                    color: '#1976d2',
                    border: '2px solid #90caf9',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '11px', marginBottom: '2px' }}>Average</div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>{averageLatency.toFixed(2)}s</div>
                  </div>
                )}
                {totalLatency !== null && (
                  <div style={{
                    padding: '10px 16px',
                    background: '#f3e5f5',
                    borderRadius: '6px',
                    color: '#7b1fa2',
                    border: '2px solid #ce93d8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '11px', marginBottom: '2px' }}>Total</div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>{totalLatency.toFixed(2)}s</div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Grid Container */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ 
              display: 'inline-grid',
              gridTemplateColumns: `80px repeat(${numGuidanceSamples}, 200px)`,
              gridTemplateRows: `40px repeat(${numSeeds}, 200px)`,
              gap: '10px',
              minWidth: 'fit-content'
            }}>
              {/* Top-left corner cell */}
              <div style={{
                gridColumn: 1,
                gridRow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: '#666'
              }}>
                Seed / Scale
              </div>
              
              {/* Guidance Scale Headers (Horizontal) */}
              {guidanceScaleValues.map((scale, idx) => (
                <div
                  key={`header-${idx}`}
                  style={{
                    gridColumn: idx + 2,
                    gridRow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1976d2',
                    background: '#e3f2fd',
                    borderRadius: '4px',
                    padding: '5px'
                  }}
                >
                  {scale}
                </div>
              ))}
              
              {/* Seed Labels (Vertical) */}
              {Array.from({ length: numSeeds }, (_, seedIdx) => (
                <div
                  key={`seed-label-${seedIdx}`}
                  style={{
                    gridColumn: 1,
                    gridRow: seedIdx + 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#1976d2',
                    background: '#e3f2fd',
                    borderRadius: '4px',
                    padding: '5px'
                  }}
                >
                  Seed {seedIdx}
                </div>
              ))}
              
              {/* Image Grid Cells */}
              {Array.from({ length: numSeeds }, (_, seedIdx) => 
                Array.from({ length: numGuidanceSamples }, (_, guidanceIdx) => {
                  const key = `${seedIdx}-${guidanceIdx}`;
                  const cell = imageGrid[key] || { 
                    loading: true, 
                    imageUrl: null, 
                    clipScore: null,
                    clipComputationTime: null,
                    generationTime: null,
                    seed: null,
                    guidanceScale: null
                  };
                  
                  return (
                    <div
                      key={key}
                      style={{
                        gridColumn: guidanceIdx + 2,
                        gridRow: seedIdx + 2,
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid #e0e0e0',
                        position: 'relative',
                        cursor: cell.imageUrl ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (cell.imageUrl) {
                          setExpandedImage({
                            ...cell,
                            seedIndex: seedIdx,
                            guidanceIndex: guidanceIdx
                          });
                        }
                      }}
                    >
                      {cell.loading ? (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%'
                        }}>
                          <div style={{ 
                            width: '40px',
                            height: '40px',
                            border: '4px solid #f3f3f3',
                            borderTop: '4px solid #007bff',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          <div style={{ 
                            marginTop: '10px',
                            fontSize: '12px',
                            color: '#666'
                          }}>
                            Loading...
                          </div>
                        </div>
                      ) : cell.imageUrl ? (
                        <>
                          <img
                            src={cell.imageUrl}
                            alt={`Seed ${seedIdx}, Scale ${guidanceScaleValues[guidanceIdx]}`}
                            style={{ 
                              width: '100%',
                              height: 'auto',
                              borderRadius: '4px',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          {cell.generationTime !== null && (
                            <div style={{
                              marginTop: '5px',
                              fontSize: '10px',
                              fontWeight: '500',
                              color: '#666',
                              background: '#f0f0f0',
                              padding: '2px 6px',
                              borderRadius: '3px'
                            }}>
                              {cell.generationTime}s
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setExpandedImage(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              gap: '20px',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setExpandedImage(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                zIndex: 1
              }}
            >
              ×
            </button>
            
            {/* Image */}
            <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={expandedImage.imageUrl}
                alt="Expanded"
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}
              />
            </div>
            
            {/* Info panel */}
            <div style={{
              width: '250px',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              fontSize: '14px'
            }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#333' }}>Image Details</h3>
              
              <div style={{
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600', color: '#666' }}>Seed Index:</span>
                  <span style={{ color: '#333' }}>{expandedImage.seedIndex}</span>
                </div>
                
                {expandedImage.seed !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600', color: '#666' }}>Seed Value:</span>
                    <span style={{ color: '#333' }}>{expandedImage.seed}</span>
                  </div>
                )}
                
                {expandedImage.guidanceScale !== null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600', color: '#666' }}>Guidance Scale:</span>
                    <span style={{ color: '#333' }}>{expandedImage.guidanceScale}</span>
                  </div>
                )}
              </div>
              
              {expandedImage.generationTime !== null && (
                <div style={{
                  padding: '12px',
                  background: '#e3f2fd',
                  borderRadius: '6px',
                  border: '2px solid #2196f3'
                }}>
                  <div style={{ fontWeight: '600', color: '#1976d2', marginBottom: '5px' }}>
                    Generation Time
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1565c0' }}>
                    {expandedImage.generationTime}s
                  </div>
                </div>
              )}
              
              {expandedImage.clipScore !== null && (
                <div style={{
                  padding: '12px',
                  background: '#e8f5e9',
                  borderRadius: '6px',
                  border: '2px solid #4caf50'
                }}>
                  <div style={{ fontWeight: '600', color: '#2e7d32', marginBottom: '5px' }}>
                    CLIP Score
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1b5e20' }}>
                    {expandedImage.clipScore.toFixed(4)}
                  </div>
                  {expandedImage.clipComputationTime !== null && (
                    <div style={{ fontSize: '11px', color: '#2e7d32', marginTop: '5px' }}>
                      Computed in {expandedImage.clipComputationTime}s
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PromptGenerator;