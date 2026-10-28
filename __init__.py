import math
import comfy_extras.nodes_moss_image as nmi

def calc_1mp_bucket(width: int, height: int, multiple: int = 16):
    aspect = float(width) / float(height)
    base_area = 1024.0 * 1024.0
    w_1mp = round(math.sqrt(base_area * aspect) / multiple) * multiple
    h_1mp = round(math.sqrt(base_area / aspect) / multiple) * multiple
    return max(multiple, int(w_1mp)), max(multiple, int(h_1mp))

if hasattr(nmi, "MOSSImageLayoutPrompt"):
    _orig_moss_execute = nmi.MOSSImageLayoutPrompt.execute

    @classmethod
    def _patched_moss_execute(cls, prompt, element=None, width=1024, height=1024, character_boxes="", **kwargs):
        if (width * height) > (1024 * 1024 * 1.05):
            coord_w, coord_h = calc_1mp_bucket(width, height, 16)
        else:
            coord_w, coord_h = width, height
            
        return _orig_moss_execute(
            prompt=prompt,
            element=element,
            width=coord_w,
            height=coord_h,
            character_boxes=character_boxes,
            **kwargs
        )

    nmi.MOSSImageLayoutPrompt.execute = _patched_moss_execute
    print("[MOSS BBox Fix] Патч координат >1MP и авто-синхронизация холста активны!")

# Указываем ComfyUI загрузить наш sync_canvas.js в браузер
WEB_DIRECTORY = "."
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}