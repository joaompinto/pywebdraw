import { Shape } from '../Shape.js';

export class ClipboardManager {
    constructor() {
        this.clipboard = [];
    }

    copyShapes(shapes) {
        // Move from CanvasManager
        if (shapes.length === 0) return;
        
        this.clipboard = shapes.map(shape => ({
            type: shape.type,
            color: shape.color,
            rotation: shape.rotation || 0,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            size: shape.size,
            x1: shape.x1,
            y1: shape.y1,
            x2: shape.x2,
            y2: shape.y2
        }));
    }

    pasteShapes(mousePos) {
        // Move from CanvasManager
        if (this.clipboard.length === 0) return [];

        const bounds = this.getClipboardBounds();
        const offsetX = mousePos.x - (bounds.x + bounds.width/2);
        const offsetY = mousePos.y - (bounds.y + bounds.height/2);

        return this.clipboard.map(item => {
            const props = {
                color: item.color,
                x: item.x + offsetX,
                y: item.y + offsetY,
                width: item.width,
                height: item.height,
                size: item.size,
                x1: item.x1 + offsetX,
                y1: item.y1 + offsetY,
                x2: item.x2 + offsetX,
                y2: item.y2 + offsetY
            };

            const shape = new Shape(item.type, props);
            shape.rotation = item.rotation;
            return shape;
        });
    }

    getClipboardBounds() {
        if (this.clipboard.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.clipboard.forEach(item => {
            switch(item.type) {
                case 'rectangle':
                case 'triangle':
                    minX = Math.min(minX, item.x);
                    minY = Math.min(minY, item.y);
                    maxX = Math.max(maxX, item.x + item.width);
                    maxY = Math.max(maxY, item.y + item.height);
                    break;
                case 'circle':
                    minX = Math.min(minX, item.x);
                    minY = Math.min(minY, item.y);
                    maxX = Math.max(maxX, item.x + item.size * 2);
                    maxY = Math.max(maxY, item.y + item.size * 2);
                    break;
                case 'line':
                    minX = Math.min(minX, item.x1, item.x2);
                    minY = Math.min(minY, item.y1, item.y2);
                    maxX = Math.max(maxX, item.x1, item.x2);
                    maxY = Math.max(maxY, item.y1, item.y2);
                    break;
            }
        });
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}
