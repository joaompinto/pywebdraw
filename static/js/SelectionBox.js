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
        this.showResizeHandles = false;
        this.activeHandle = null;
        this.handleSize = 8;
        this.activeHandle = null;  // Track currently active handle
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
                return Math.min(shape.x1, shape.x2) >= box.left && 
                       Math.max(shape.x1, shape.x2) <= box.right &&
                       Math.min(shape.y1, shape.y2) >= box.top && 
                       Math.max(shape.y1, shape.y2) <= box.bottom;
            
            case 'circle':
                // Update to use centerX/centerY/radius
                return shape.centerX - shape.radius >= box.left &&
                       shape.centerX + shape.radius <= box.right &&
                       shape.centerY - shape.radius >= box.top &&
                       shape.centerY + shape.radius <= box.bottom;
            
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
            case 'line':
                return {
                    left: Math.min(shape.x1, shape.x2),
                    right: Math.max(shape.x1, shape.x2),
                    top: Math.min(shape.y1, shape.y2),
                    bottom: Math.max(shape.y1, shape.y2)
                };

            case 'circle':
                // Update to use centerX/centerY/radius
                return {
                    left: shape.centerX - shape.radius,
                    right: shape.centerX + shape.radius,
                    top: shape.centerY - shape.radius,
                    bottom: shape.centerY + shape.radius
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

    getHandlePositions() {
        const bounds = this.getBounds();
        
        // Special case for single circle selection
        if (this.selectedShapes.size === 1) {
            const shape = Array.from(this.selectedShapes)[0];
            if (shape.type === 'circle') {
                // Add single handle at right side of circle
                return [{
                    x: shape.centerX + shape.radius,
                    y: shape.centerY,
                    cursor: 'ew-resize',
                    isCircleHandle: true,
                    shape: shape
                }];
            }
        }
        
        // Default rectangle handles for other cases
        return [
            { x: bounds.left, y: bounds.top, cursor: 'nw-resize', isLeft: true, isTop: true },
            { x: bounds.right, y: bounds.top, cursor: 'ne-resize', isLeft: false, isTop: true },
            { x: bounds.right, y: bounds.bottom, cursor: 'se-resize', isLeft: false, isTop: false },
            { x: bounds.left, y: bounds.bottom, cursor: 'sw-resize', isLeft: true, isTop: false }
        ];
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

        // Draw resize handles if enabled
        if (this.showResizeHandles) {
            ctx.setLineDash([]); // Solid line for handles
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#0066ff';
            
            const handles = this.getHandlePositions();
            handles.forEach((handle) => {
                if (handle.isCircleHandle) {
                    // Draw circular handle for circle resize
                    ctx.beginPath();
                    ctx.arc(handle.x, handle.y, this.handleSize/2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    // Draw square handles for other shapes
                    ctx.fillRect(handle.x - this.handleSize/2, handle.y - this.handleSize/2, 
                               this.handleSize, this.handleSize);
                    ctx.strokeRect(handle.x - this.handleSize/2, handle.y - this.handleSize/2, 
                                 this.handleSize, this.handleSize);
                }
            });
        }
        
        ctx.restore();
    }

    getHandleAtPosition(point) {
        // If there's already an active handle, only return that one
        if (this.activeHandle) {
            return this.activeHandle;
        }

        if (!this.showResizeHandles) return null;
        
        const handles = this.getHandlePositions();
        const tolerance = this.handleSize / 2;
        
        // Find the handle closest to the point within tolerance
        let closestHandle = null;
        let minDistance = Infinity;
        
        for (const handle of handles) {
            const dx = point.x - handle.x;
            const dy = point.y - handle.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance <= tolerance && distance < minDistance) {
                minDistance = distance;
                closestHandle = handle;
            }
        }
        
        return closestHandle;
    }

    // Add methods to manage active handle state
    setActiveHandle(handle) {
        this.activeHandle = handle;
    }

    clearActiveHandle() {
        this.activeHandle = null;
    }

    resizeByHandle(handle, mousePos) {
        if (!handle) return;
        
        const bounds = this.getBounds();
        const isLeft = Math.abs(handle.x - bounds.left) < this.handleSize;
        const isTop = Math.abs(handle.y - bounds.top) < this.handleSize;
        
        const minSize = 5;
        
        // When resizing, keep the opposite corner fixed and update only the dragged corner
        if (isLeft && isTop) {
            // Top-left: keep bottom-right fixed
            this.startX = Math.min(bounds.right - minSize, mousePos.x);
            this.startY = Math.min(bounds.bottom - minSize, mousePos.y);
        } else if (!isLeft && isTop) {
            // Top-right: keep bottom-left fixed
            this.endX = Math.max(bounds.left + minSize, mousePos.x);
            this.startY = Math.min(bounds.bottom - minSize, mousePos.y);
        } else if (isLeft && !isTop) {
            // Bottom-left: keep top-right fixed
            this.startX = Math.min(bounds.right - minSize, mousePos.x);
            this.endY = Math.max(bounds.top + minSize, mousePos.y);
        } else {
            // Bottom-right: keep top-left fixed
            this.endX = Math.max(bounds.left + minSize, mousePos.x);
            this.endY = Math.max(bounds.top + minSize, mousePos.y);
        }
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
