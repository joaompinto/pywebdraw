export class ShapeTransformer {
    static resizeRectangularShape(shape, dx, dy, handle, rotation) {
        // Transform delta based on rotation
        const rad = rotation;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedDx = cos * dx + sin * dy;
        const rotatedDy = -sin * dx + cos * dy;

        // For middle handles (4 and 5), only use horizontal component
        if (handle === 4 || handle === 5) {
            switch(handle) {
                case 4: // middle-left
                    shape.x += rotatedDx;
                    shape.width -= rotatedDx;
                    break;
                case 5: // middle-right
                    shape.width += rotatedDx;
                    break;
            }
        } else {
            // For corner handles, use both components
            switch(handle) {
                case 0: // Top-Left
                    shape.x += rotatedDx;
                    shape.y += rotatedDy;
                    shape.width -= rotatedDx;
                    shape.height -= rotatedDy;
                    break;
                case 1: // Top-Right
                    shape.y += rotatedDy;
                    shape.width += rotatedDx;
                    shape.height -= rotatedDy;
                    break;
                case 2: // Bottom-Right
                    shape.width += rotatedDx;
                    shape.height += rotatedDy;
                    break;
                case 3: // Bottom-Left
                    shape.x += rotatedDx;
                    shape.width -= rotatedDx;
                    shape.height += rotatedDy;
                    break;
            }
        }

        // Ensure minimum size
        shape.width = Math.max(10, shape.width);
        shape.height = Math.max(10, shape.height);

        shape.normalizeRotationHandle();
    }

    static resizeCircle(shape, dx, dy, handle, rotation) {
        // For circles, resizing can be uniform based on horizontal or vertical drag
        switch(handle) {
            case 0: // Top
            case 2: // Bottom
                shape.size += dy / 2;
                break;
            case 1: // Right
            case 3: // Left
                shape.size += dx / 2;
                break;
        }
        shape.size = Math.max(10, shape.size);
        shape.normalizeRotationHandle();
    }

    static resizeLine(shape, dx, dy, handle, rotation) {
        // Transform delta based on rotation
        const rad = rotation;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rotatedDx = cos * dx + sin * dy;
        const rotatedDy = -sin * dx + cos * dy;

        if (handle === 0) { // Start Point
            shape.x1 += rotatedDx;
            shape.y1 += rotatedDy;
        } else if (handle === 2) { // End Point
            shape.x2 += rotatedDx;
            shape.y2 += rotatedDy;
        }
        shape.normalizeRotationHandle();
    }

    static resizeGroup(shapes, dx, dy, handle, rotation) {
        shapes.forEach(shape => {
            switch(shape.type) {
                case 'rectangle':
                case 'triangle':
                    this.resizeRectangularShape(shape, dx, dy, handle, rotation);
                    break;
                case 'circle':
                    this.resizeCircle(shape, dx, dy, handle, rotation);
                    break;
                case 'line':
                    this.resizeLine(shape, dx, dy, handle, rotation);
                    break;
            }
        });
    }

    static getShapeBounds(shape) {
        // Get base bounds first
        let bounds;
        switch(shape.type) {
            case 'rectangle':
            case 'triangle':
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };
                break;
            case 'circle':
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.size * 2,
                    height: shape.size * 2
                };
                break;
            case 'line':
                bounds = {
                    x: Math.min(shape.x1, shape.x2),
                    y: Math.min(shape.y1, shape.y2),
                    width: Math.abs(shape.x2 - shape.x1),
                    height: Math.abs(shape.y2 - shape.y1)
                };
                break;
            default:
                throw new Error(`Unknown shape type: ${shape.type}`);
        }

        // If shape is rotated, calculate rotated bounds
        if (shape.rotation && shape.rotation !== 0) {
            const center = shape.getCenter();
            const corners = [
                { x: bounds.x, y: bounds.y },
                { x: bounds.x + bounds.width, y: bounds.y },
                { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
                { x: bounds.x, y: bounds.y + bounds.height }
            ].map(p => this.rotatePoint(p, center, shape.rotation));

            const xs = corners.map(p => p.x);
            const ys = corners.map(p => p.y);

            return {
                x: Math.min(...xs),
                y: Math.min(...ys),
                width: Math.max(...xs) - Math.min(...xs),
                height: Math.max(...ys) - Math.min(...ys)
            };
        }

        return bounds;
    }

    static rotatePoint(point, center, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    }

    static boxesIntersect(box1, box2) {
        // Move from CanvasManager
        return !(box2.x > box1.x + box1.width || 
                box2.x + box2.width < box1.x || 
                box2.y > box1.y + box1.height ||
                box2.y + box2.height < box1.y);
    }
}
