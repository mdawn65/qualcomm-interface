# ---------------------------------------------------------------------
# Copyright (c) 2025 Qualcomm Technologies, Inc. and/or its subsidiaries.
# SPDX-License-Identifier: BSD-3-Clause
# ---------------------------------------------------------------------
import argparse
import time
from datetime import datetime

import numpy as np
from diffusers import DDIMScheduler
from PIL import Image
from qai_hub_models.models._shared.stable_diffusion.app import StableDiffusionApp
from qai_hub_models.utils.args import add_output_dir_arg
from qai_hub_models.utils.display import display_or_save_image, to_uint8
from qai_hub_models.utils.onnx.torch_wrapper import OnnxModelTorchWrapper
from transformers import CLIPTokenizer

DEFAULT_PROMPT = "A girl taking a walk at sunset"
HF_REPO = "RedbeardNZ/stable-diffusion-2-1-base"


def timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


def main():
    parser = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        conflict_handler="error",
    )
    parser.add_argument(
        "--prompt",
        type=str,
        default=DEFAULT_PROMPT,
        help="Prompt for stable diffusion",
    )
    parser.add_argument(
        "--num-steps",
        type=int,
        default=20,
        help="Number of diffusion steps",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=41,
        help="Random generator seed",
    )
    parser.add_argument(
        "--text-encoder",
        type=str,
        default="build\\stable_diffusion_v2_1_w8a16\\precompiled\\qualcomm-snapdragon-x-elite\\text_encoder\\model.onnx",
        help="Text Encoder ONNX model path",
    )
    parser.add_argument(
        "--unet",
        type=str,
        default="build\\stable_diffusion_v2_1_w8a16\\precompiled\\qualcomm-snapdragon-x-elite\\unet\\model.onnx",
        help="UNET ONNX model path",
    )
    parser.add_argument(
        "--vae-decoder",
        type=str,
        default="build\\stable_diffusion_v2_1_w8a16\\precompiled\\qualcomm-snapdragon-x-elite\\vae_decoder\\model.onnx",
        help="VAE Decoder ONNX model path",
    )
    add_output_dir_arg(parser)
    args = parser.parse_args()

    # Load model
    print(f"[{timestamp()}] Loading model and app...")
    load_start = time.time()

    sdapp = StableDiffusionApp(
        OnnxModelTorchWrapper.OnNPU(args.text_encoder),
        OnnxModelTorchWrapper.OnNPU(args.vae_decoder),
        OnnxModelTorchWrapper.OnNPU(args.unet),
        CLIPTokenizer.from_pretrained(HF_REPO, subfolder="tokenizer"),
        DDIMScheduler.from_pretrained(HF_REPO, subfolder="scheduler"),
        channel_last_latent=True,
    )

    load_end = time.time()
    print(f"[{timestamp()}] Model loaded in {load_end - load_start:.2f} seconds\n")


    # Generate image
    print(f"[{timestamp()}] Generating image...")
    gen_start = time.time()

    image = sdapp.generate_image(args.prompt, args.num_steps, args.seed)

    gen_end = time.time()
    print(f"[{timestamp()}] Image generated in {gen_end - gen_start:.2f} seconds\n")

    total_time = gen_end - load_start
    print(f"[{timestamp()}] TOTAL execution time: {total_time:.2f} seconds\n")

    pil_img = Image.fromarray(to_uint8(np.asarray(image))[0])
    display_or_save_image(pil_img, args.output_dir)


if __name__ == "__main__":
    main()
