export class SelectionBox {
    constructor() {
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.isActive = false;
        this.selectedShapes = new Set();
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
    }

    start(x, y) {
        this.startX = x;
        this.startY = y;
        this.endX = x;
        this.endY = y;
        this.isActive = true;
    }

    update(x, y) {
        this.endX = x;
        this.endY = y;
    }

    stop() {
        // Only clear if there are no selected shapes
        if (this.selectedShapes.size === 0) {
            this.clear();
        } else {
            this.isActive = false;  // Stop active dragging but keep box visible
        }
    }

    clear() {
        this.selectedShapes.clear();
        this.isActive = false;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
    }

    getBounds() {
        return {
            left: Math.min(this.startX, this.endX),
            right: Math.max(this.startX, this.endX),
            top: Math.min(this.startY, this.endY),
            bottom: Math.max(this.startY, this.endY)
        };
    }

    containsPoint(point) {
        const bounds = this.getBounds();
        return point.x >= bounds.left &&
               point.x <= bounds.right &&
               point.y >= bounds.top &&
               point.y <= bounds.bottom;
    }

    isShapeFullyInBox(shape) {
        const box = this.getBounds();
        switch(shape.type) {
            case 'rectangle':
            case 'triangle':
                return shape.x >= box.left && 
                       shape.x + shape.width <= box.right &&
                       shape.y >= box.top && 
                       shape.y + shape.height <= box.bottom;
            
            case 'circle': {
                const centerX = shape.x + shape.size;
                const centerY = shape.y + shape.size;
                return centerX - shape.size >= box.left &&
                       centerX + shape.size <= box.right &&
                       centerY - shape.size >= box.top &&
                       centerY + shape.size <= box.bottom;
            }
            
            case 'line':
                return shape.x1 >= box.left &&
                       shape.x1 <= box.right &&
                       shape.y1 >= box.top &&
                       shape.y1 <= box.bottom &&
                       shape.x2 >= box.left &&
                       shape.x2 <= box.right &&
                       shape.y2 >= box.top &&
                       shape.y2 <= box.bottom;
        }
        return false;
    }

    calculateBounds() {
        if (this.selectedShapes.size === 0) {
            this.clear();
            return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        this.selectedShapes.forEach(shape => {
            const bounds = this.getShapeBounds(shape);
            minX = Math.min(minX, bounds.left);
            maxX = Math.max(maxX, bounds.right);
            minY = Math.min(minY, bounds.top);
            maxY = Math.max(maxY, bounds.bottom);
        });

        // Add padding
        const padding = 5;
        this.startX = minX - padding;
        this.startY = minY - padding;
        this.endX = maxX + padding;
        this.endY = maxY + padding;
        
        // Enable selection box
        this.isActive = true;
    }

    getShapeBounds(shape) {
        switch(shape.type) {
            case 'rectangle':
            case 'triangle':
                return {
                    left: shape.x,
                    right: shape.x + shape.width,
                    top: shape.y,
                    bottom: shape.y + shape.height
                };

            case 'circle':
                return {
                    left: shape.x,
                    right: shape.x + shape.size * 2,
                    top: shape.y,
                    bottom: shape.y + shape.size * 2
                };

            case 'line':
                return {
                    left: Math.min(shape.x1, shape.x2),
                    right: Math.max(shape.x1, shape.x2),
                    top: Math.min(shape.y1, shape.y2),
                    bottom: Math.max(shape.y1, shape.y2)
                };

            default:
                return {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0
                };
        }
    }

    draw(ctx) {
        if (!this.isActive && this.selectedShapes.size === 0) return;

        ctx.save();
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        const width = this.endX - this.startX;
        const height = this.endY - this.startY;
        
        if (this.isActive) {
            ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
            ctx.fillRect(this.startX, this.startY, width, height);
        }
        
        ctx.strokeRect(this.startX, this.startY, width, height);
        ctx.restore();
    }

    startDragging(x, y) {
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
    }

    updateDrag(x, y) {
        if (!this.isDragging) return;
        
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;

        // Update selection box position
        this.startX += dx;
        this.startY += dy;
        this.endX += dx;
        this.endY += dy;

        // Update drag start position
        this.dragStartX = x;
        this.dragStartY = y;

        return { dx, dy };
    }

    stopDragging() {
        this.isDragging = false;
    }
}
