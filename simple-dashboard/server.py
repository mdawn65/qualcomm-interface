import argparse
import base64
import io
import json
import time
from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import numpy as np
import torch
from diffusers import DDIMScheduler
from PIL import Image
from qai_hub_models.models._shared.stable_diffusion.app import StableDiffusionApp
from qai_hub_models.utils.display import to_uint8
from qai_hub_models.utils.onnx.torch_wrapper import OnnxModelTorchWrapper
from transformers import CLIPTokenizer, CLIPProcessor, CLIPModel

app = Flask(__name__)
CORS(app)

# Model paths
HF_REPO = "Manojb/stable-diffusion-2-1-base"
TEXT_ENCODER_PATH = r"C:\Users\maggi\projects\qualcomm-interface\simple-dashboard\StableDiffusion\build\stable_diffusion_v2_1_w8a16\precompiled\qualcomm-snapdragon-x-elite\text_encoder\model.onnx"
UNET_PATH = r"C:\Users\maggi\projects\qualcomm-interface\simple-dashboard\StableDiffusion\build\stable_diffusion_v2_1_w8a16\precompiled\qualcomm-snapdragon-x-elite\unet\model.onnx"
VAE_DECODER_PATH = r"C:\Users\maggi\projects\qualcomm-interface\simple-dashboard\StableDiffusion\build\stable_diffusion_v2_1_w8a16\precompiled\qualcomm-snapdragon-x-elite\vae_decoder\model.onnx"

# Global model instances
sdapp = None
clip_model = None
clip_processor = None
device = None

def initialize_model():
    """Initialize the Stable Diffusion model once at startup"""
    global sdapp, clip_model, clip_processor, device
    
    print("Loading Stable Diffusion model...")
    sdapp = StableDiffusionApp(
        OnnxModelTorchWrapper.OnNPU(TEXT_ENCODER_PATH),
        OnnxModelTorchWrapper.OnNPU(VAE_DECODER_PATH),
        OnnxModelTorchWrapper.OnNPU(UNET_PATH),
        CLIPTokenizer.from_pretrained(HF_REPO, subfolder="tokenizer"),
        DDIMScheduler.from_pretrained(HF_REPO, subfolder="scheduler"),
        channel_last_latent=True,
    )
    print("Stable Diffusion model loaded successfully!")
    
    # Initialize CLIP model for scoring
    print("Loading CLIP model for scoring...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(device)
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    print(f"CLIP model loaded successfully on {device}!")

def compute_clip_score_fn(pil_image, text):
    """
    Compute CLIP score for a PIL Image and text prompt
    Returns: (clip_score, computation_time)
    """
    start_time = time.time()
    
    # Preprocess
    inputs = clip_processor(text=[text], images=pil_image, return_tensors="pt", padding=True).to(device)

    # Forward pass
    with torch.no_grad():
        image_features = clip_model.get_image_features(pixel_values=inputs["pixel_values"])
        text_features = clip_model.get_text_features(
            input_ids=inputs["input_ids"], 
            attention_mask=inputs["attention_mask"]
        )

    # Normalize features
    image_features /= image_features.norm(p=2, dim=-1, keepdim=True)
    text_features /= text_features.norm(p=2, dim=-1, keepdim=True)

    # Compute cosine similarity
    clip_score = (image_features @ text_features.T).item()
    
    computation_time = time.time() - start_time
    
    return clip_score, computation_time

def image_to_base64(pil_image):
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    pil_image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return img_str

def calculate_guidance_scale_values(min_scale, max_scale, num_samples):
    """Calculate guidance scale values rounded to nearest 0.5"""
    if num_samples == 1:
        return [round(min_scale * 2) / 2]
    
    values = []
    step = (max_scale - min_scale) / (num_samples - 1)
    for i in range(num_samples):
        value = min_scale + step * i
        # Round to nearest 0.5
        values.append(round(value * 2) / 2)
    return values

@app.route('/generate/', methods=['POST'])
def generate():
    """Handle image generation requests with streaming responses"""
    try:
        data = request.json
        prompt = data.get('prompt', 'A girl taking a walk at sunset')
        num_steps = data.get('num_steps', 20)
        num_seeds = data.get('num_seeds', 1)
        num_guidance_samples = data.get('num_guidance_samples', 1)
        guidance_scale_min = data.get('guidance_scale_min', 7.5)
        guidance_scale_max = data.get('guidance_scale_max', 7.5)
        compute_clip_score = data.get('compute_clip_score', False)
        seeds = data.get('seeds', [])
        
        # If no seeds provided, generate random ones
        if not seeds or len(seeds) != num_seeds:
            import random
            seeds = [random.randint(0, 2147483647) for _ in range(num_seeds)]
        
        # Calculate guidance scale values
        guidance_scales = calculate_guidance_scale_values(
            guidance_scale_min, 
            guidance_scale_max, 
            num_guidance_samples
        )
        
        print(f"Received request: prompt='{prompt}', steps={num_steps}, seeds={num_seeds}, guidance_samples={num_guidance_samples}")
        print(f"Seeds: {seeds}")
        print(f"Guidance scales: {guidance_scales}")
        
        def generate_images():
            """Generator function for streaming responses"""
            total_start_time = time.time()
            generation_times = []
            
            for seed_idx in range(num_seeds):
                # Use the random seed from the request
                seed = seeds[seed_idx]
                
                for guidance_idx, guidance_scale in enumerate(guidance_scales):
                    print(f"Generating image: Seed {seed_idx} ({seed}), Guidance {guidance_scale}")
                    
                    # Time the generation
                    start_time = time.time()
                    
                    # Generate image
                    image = sdapp.generate_image(
                        prompt, 
                        num_steps, 
                        seed, 
                        guidance_scale=guidance_scale
                    )
                    
                    generation_time = time.time() - start_time
                    generation_times.append(generation_time)
                    
                    # Convert to PIL Image
                    pil_img = Image.fromarray(to_uint8(np.asarray(image))[0])
                    
                    # Convert to base64
                    img_base64 = image_to_base64(pil_img)
                    
                    # Compute CLIP score if requested
                    clip_score = None
                    clip_computation_time = None
                    if compute_clip_score:
                        clip_score, clip_computation_time = compute_clip_score_fn(pil_img, prompt)
                        print(f"CLIP Score: {clip_score:.4f}, Computation time: {clip_computation_time:.2f}s")
                    
                    # Send image data as SSE (Server-Sent Events)
                    response_data = {
                        'type': 'image',
                        'seed_index': seed_idx,
                        'guidance_index': guidance_idx,
                        'seed': seed,
                        'guidance_scale': guidance_scale,
                        'imageBase64': img_base64,
                        'generationTime': round(generation_time, 2),
                        'clipScore': round(clip_score, 4) if clip_score is not None else None,
                        'clipComputationTime': round(clip_computation_time, 2) if clip_computation_time is not None else None
                    }
                    
                    yield f"data: {json.dumps(response_data)}\n\n"
                    print(f"Sent image: Seed {seed_idx}, Guidance {guidance_idx}, Time: {generation_time:.2f}s")
            
            # Send completion message with statistics
            total_time = time.time() - total_start_time
            average_time = sum(generation_times) / len(generation_times) if generation_times else 0
            
            completion_data = {
                'type': 'complete',
                'totalLatency': round(total_time, 2),
                'averageLatency': round(average_time, 2)
            }
            yield f"data: {json.dumps(completion_data)}\n\n"
            print(f"All images generated. Total time: {total_time:.2f}s, Average: {average_time:.2f}s")
        
        return Response(
            generate_images(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        print(f"Error during generation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'model_loaded': sdapp is not None
    })

if __name__ == '__main__':
    # Initialize model at startup
    initialize_model()
    
    # Start server
    print("Starting Flask server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)