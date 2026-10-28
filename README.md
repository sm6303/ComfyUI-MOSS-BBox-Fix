# ComfyUI MOSS-Image BBox & Aspect Ratio Fix

Seamless drop-in patch for ComfyUI that fixes two major issues when working with **MOSS-Image** and native **`Create Bounding Boxes`** nodes:

1. **Fixes broken BBox coordinates above 1.0 MP (>1024x1024):**
   Automatically normalizes and maps `MOSSImageLayoutPrompt` spatial coordinates into the optimal 1.0 MP aspect-ratio-preserving coordinate bucket under the hood, while allowing the sampler to render in full high resolution (1.5 MP, 2.0 MP+) across any aspect ratio (16:9, 9:16, 4:3, etc.).
2. **Real-Time Canvas Aspect Ratio Sync:**
   Automatically updates the visual drawing canvas inside `Create Bounding Boxes` the instant you change `aspect_ratio` or `megapixels` in a connected `Resolution Selector` node — no need to unplug wires or run a dummy generation first.

## Zero-Config Usage
Works automatically with the **[default ComfyUI MOSS-Image-BBOX workflow](https://github.com/Comfy-Org/workflow_templates/blob/main/templates/image_moss_image_t2i_bboxes.json)**. You don't need to add any extra nodes or change your wiring!

## Installation

Navigate to your `ComfyUI/custom_nodes/` folder and run:
```bash
git clone https://github.com/sm6303/ComfyUI-MOSS-BBox-Fix.git