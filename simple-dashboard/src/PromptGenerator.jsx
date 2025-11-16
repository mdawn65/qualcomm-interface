import React, { useState } from "react";

const PromptGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setImageUrl(null);

    try {
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

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    } catch (error) {
      console.error(error);
      alert("Error generating image.");
    }

    setLoading(false);
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
            src={imageUrl}
            alt="generated"
            style={{ width: "400px", borderRadius: "8px" }}
          />
        </div>
      )}
    </div>
  );
};

export default PromptGenerator;
