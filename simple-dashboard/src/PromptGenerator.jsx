import React, { useState } from "react";
import { useLatencyTracker } from "./useLatencyTracker";
import "./App.css";

const PromptGenerator = ({ selectedView, onLatencyCalculated }) => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Use the latency tracker hook
  const {
    imageRef,
    handleImageLoad,
    handleImageError,
    startTracking,
    resetTracking
  } = useLatencyTracker(imageUrl, onLatencyCalculated);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    console.log('[PromptGenerator] Generate button clicked');
    setLoading(true);
    setImageUrl(null);

    // Start tracking latency when button is clicked
    startTracking(selectedView);

    try {
      console.log('[PromptGenerator] Fetching image from server...');
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

      console.log('[PromptGenerator] Received response, creating blob...');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      console.log('[PromptGenerator] Blob URL created, setting image URL...');

      // Display the image - latency tracker will handle tracking when it loads
      setImageUrl(url);
      setLoading(false);
    } catch (error) {
      console.error('[PromptGenerator] Error:', error);
      alert("Error generating image.");
      setLoading(false);
      resetTracking();
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
            ref={imageRef}
            src={imageUrl}
            alt="Generated"
            onLoad={handleImageLoad}
            onError={handleImageError}
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
