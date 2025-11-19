import React, { useState, useRef, useEffect } from "react";
import { useLatencyTracker } from "./useLatencyTracker";

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
    <div style={{ padding: 20 }}>
      <h2>Image Generator</h2>

      <input
        type="text"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        style={{ width: "300px", padding: "8px" }}
      />

      <button
        onClick={generateImage}
        style={{ marginLeft: "10px", padding: "8px 12px" }}
      >
        Generate
      </button>

      {loading && <p>Generating image...</p>}

      {imageUrl && (
        <div style={{ marginTop: 20 }}>
          <img
            ref={imageRef}
            src={imageUrl}
            alt="generated"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ width: "400px", borderRadius: "8px" }}
          />
        </div>
      )}
    </div>
  );
};

export default PromptGenerator;
