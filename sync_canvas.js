import { app } from "../../scripts/app.js";

const ASPECT_MAP = {
    "1:1": [1, 1],
    "2:3": [2, 3],
    "3:2": [3, 2],
    "3:4": [3, 4],
    "4:3": [4, 3],
    "9:16": [9, 16],
    "16:9": [16, 9],
    "21:9": [21, 9],
};

function calcDims(arString, mp = 1.0, mult = 16) {
    let ratio = 1.0;
    for (const [key, [w, h]] of Object.entries(ASPECT_MAP)) {
        if (String(arString).startsWith(key)) {
            ratio = w / h;
            break;
        }
    }
    const area = mp * 1024 * 1024;
    const w = Math.max(mult, Math.round(Math.sqrt(area * ratio) / mult) * mult);
    const h = Math.max(mult, Math.round(Math.sqrt(area / ratio) / mult) * mult);
    return [w, h];
}

// Проверяет, является ли нода Create Bounding Boxes
function isBBoxNode(node) {
    return node && (node.comfyClass === "CreateBoundingBoxes" || node.title?.includes("Bounding Boxes"));
}

// Применяет вычисленные размеры из конкретной ноды Resolution Selector к конкретной ноде BBox
function applyDimsFromSelector(selectorNode, bboxNode) {
    if (!selectorNode?.widgets || !bboxNode?.widgets) return;

    const arWidget = selectorNode.widgets.find(w => w.name === "aspect_ratio");
    if (!arWidget) return;

    const mpWidget = selectorNode.widgets.find(w => w.name === "megapixels");
    const multWidget = selectorNode.widgets.find(w => w.name === "multiple");

    const [newW, newH] = calcDims(
        arWidget.value,
        mpWidget ? mpWidget.value : 1.0,
        multWidget ? multWidget.value : 16
    );

    const wWidget = bboxNode.widgets.find(w => w.name === "width");
    const hWidget = bboxNode.widgets.find(w => w.name === "height");

    if (wWidget && hWidget) {
        wWidget.value = newW;
        hWidget.value = newH;
        wWidget.callback?.(newW);
        hWidget.callback?.(newH);
    }
    bboxNode.setDirtyCanvas(true, true);
}

// Находит все ноды BBox, подключенные проводами к выходам этого Resolution Selector
function getConnectedBBoxNodes(selectorNode) {
    const connected = new Set();
    if (!selectorNode.outputs || !app.graph?.links) return connected;

    for (const output of selectorNode.outputs) {
        if (!output.links) continue;
        for (const linkId of output.links) {
            const link = app.graph.links[linkId];
            if (!link) continue;
            const targetNode = app.graph.getNodeById(link.target_id);
            if (isBBoxNode(targetNode)) {
                connected.add(targetNode);
            }
        }
    }
    return connected;
}

// Обратный поиск: находит Resolution Selector, подключенный ко входу width/height ноды BBox
function syncBBoxFromInputs(bboxNode) {
    if (!bboxNode?.inputs || !app.graph?.links) return;
    for (const input of bboxNode.inputs) {
        if ((input.name === "width" || input.name === "height") && input.link != null) {
            const link = app.graph.links[input.link];
            if (!link) continue;
            const originNode = app.graph.getNodeById(link.origin_id);
            if (originNode?.widgets?.some(w => w.name === "aspect_ratio")) {
                applyDimsFromSelector(originNode, bboxNode);
                break;
            }
        }
    }
}

app.registerExtension({
    name: "MOSS.BBoxCanvasAutoSync",
    async nodeCreated(node) {
        setTimeout(() => {
            if (!node.widgets) return;

            // 1. Если это Resolution Selector — следим за его ползунками и обновляем ТОЛЬКО подключенные по проводам BBox-ноды
            const arWidget = node.widgets.find(w => w.name === "aspect_ratio");
            if (arWidget) {
                const mpWidget = node.widgets.find(w => w.name === "megapixels");
                const multWidget = node.widgets.find(w => w.name === "multiple");

                const syncConnected = () => {
                    const targets = getConnectedBBoxNodes(node);
                    for (const bboxNode of targets) {
                        applyDimsFromSelector(node, bboxNode);
                    }
                };

                for (const w of [arWidget, mpWidget, multWidget]) {
                    if (!w) continue;
                    const origCallback = w.callback;
                    w.callback = function (...args) {
                        const res = origCallback?.apply(this, args);
                        syncConnected();
                        return res;
                    };
                }
                syncConnected();
            }

            // 2. Если это Create Bounding Boxes — синхронизируемся в момент подключения к ней провода
            if (isBBoxNode(node)) {
                const origOnConnChange = node.onConnectionsChange;
                node.onConnectionsChange = function (...args) {
                    const res = origOnConnChange?.apply(this, args);
                    syncBBoxFromInputs(this);
                    return res;
                };
                syncBBoxFromInputs(node);
            }
        }, 200);
    }
});