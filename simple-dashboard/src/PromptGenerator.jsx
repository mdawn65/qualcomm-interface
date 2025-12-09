import React, { useState } from "react";
import "./App.css";

const PromptGenerator = ({ selectedView, onLatencyCalculated, onClipCalculated }) => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    console.log('[PromptGenerator] Generate button clicked');
    setLoading(true);
    setImageUrl(null);

    try {
      if (selectedView === 'Edge') {
        console.log('[PromptGenerator] [Edge] Fetching image from server...');
        const response = await fetch("http://localhost:5000/generate/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            num_steps: 20
          })
        });

        if (!response.ok) {
          throw new Error("Failed to generate image");
        }

        const data = await response.json();
        console.log('[PromptGenerator] [Edge] Response data:', data);

        if (!data.success) {
          throw new Error(data.message || "Failed to generate image");
        }

        if (data.imageBase64) {
          const url = `data:image/png;base64,${data.imageBase64}`;
          console.log('[PromptGenerator] [Edge] Data URL created, setting image URL...');
          setImageUrl(url);
        } else {
          console.warn('[PromptGenerator] [Edge] No imageBase64 field in response');
        }

        if (typeof data.latencySeconds === 'number' && onLatencyCalculated) {
          console.log('[PromptGenerator] [Edge] Reporting latency from backend:', data.latencySeconds);
          onLatencyCalculated(data.latencySeconds, selectedView);
        }

        if (typeof data.clipScore === 'number' && onClipCalculated) {
          console.log('[PromptGenerator] [Edge] Reporting CLIP from backend:', data.clipScore);
          onClipCalculated(data.clipScore, selectedView);
        }
      } else {
        console.log('[PromptGenerator] [Cloud] Fetching image from FastAPI server...');
        const response = await fetch("http://localhost:8000/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            num_inference_steps: 20
          })
        });

        if (!response.ok) {
          throw new Error("Failed to generate image from cloud server");
        }

        const data = await response.json();
        console.log('[PromptGenerator] [Cloud] Response data:', data);

        if (data.image_url) {
          const url = `http://localhost:8000${data.image_url}`;
          console.log('[PromptGenerator] [Cloud] Image URL created, setting image URL...');
          setImageUrl(url);
        } else {
          console.warn('[PromptGenerator] [Cloud] No image_url field in response');
        }

        if (typeof data.inference_time === 'number' && onLatencyCalculated) {
          console.log('[PromptGenerator] [Cloud] Reporting latency from backend:', data.inference_time);
          onLatencyCalculated(data.inference_time, selectedView);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('[PromptGenerator] Error:', error);
      alert("Error generating image.");
      setLoading(false);
    }
  };

  return (
    <div className="prompt-container">
      <h3>Image Generator</h3>
      
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '15px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="prompt-input"
          style={{ 
            flex: '1',
            minWidth: '200px',
            marginBottom: '0',
            minHeight: 'auto',
            height: 'auto'
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !loading && prompt.trim()) {
              generateImage();
            }
          }}
        />
        <button
          onClick={generateImage}
          className="submit-button"
          disabled={loading || !prompt.trim()}
          style={{ 
            width: 'auto',
            minWidth: '120px',
            marginLeft: '0',
            opacity: (loading || !prompt.trim()) ? 0.6 : 1,
            cursor: (loading || !prompt.trim()) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '15px',
          color: '#007bff',
          fontWeight: '500'
        }}>
          <div style={{ 
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '10px',
            verticalAlign: 'middle'
          }}></div>
          Generating image...
        </div>
      )}

      {imageUrl && (
        <div style={{ 
          marginTop: '20px',
          textAlign: 'center',
          background: '#f8f9fa',
          borderRadius: '8px',
          padding: '15px'
        }}>
          <img
            src={imageUrl}
            alt="Generated"
            style={{ 
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          />
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
