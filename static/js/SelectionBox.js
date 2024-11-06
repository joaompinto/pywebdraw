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
        this.showResizeHandles = false; // Initialize to false
        this.activeHandle = null;
        this.handleSize = 8;
        this.activeHandle = null;  // Track currently active handle
        this.initialShapePositions = new Map(); // Store initial positions of shapes
        this.initialBoxPosition = null; // Store initial box position
        this.initialShapeStates = new Map(); // Add this line
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
        this.showResizeHandles = false; // Reset when clearing selection
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

        // Special case for single circle handle
        if (handle.isCircleHandle && handle.shape) {
            handle.shape.resizeCircle(mousePos.x, mousePos.y);
            
            // Update selection box to match new circle bounds
            this.startX = handle.shape.x1;
            this.startY = handle.shape.y1;
            this.endX = handle.shape.x2;
            this.endY = handle.shape.y2;
            return;
        }

        // Get current bounds before resize
        const bounds = this.getBounds();
        
        // Update selection box first
        this.updateSelectionBoxSize(handle, mousePos);

        // Resize all selected shapes
        this.selectedShapes.forEach(shape => {
            if (typeof shape.resize === 'function') {
                shape.resize(mousePos.x, mousePos.y, handle, bounds);
            }
        });
    }

    updateSelectionBoxSize(handle, mousePos) {
        const minSize = 5;
        
        if (handle.isLeft && handle.isTop) {
            this.startX = Math.min(this.endX - minSize, mousePos.x);
            this.startY = Math.min(this.endY - minSize, mousePos.y);
        } else if (!handle.isLeft && handle.isTop) {
            this.endX = Math.max(this.startX + minSize, mousePos.x);
            this.startY = Math.min(this.endY - minSize, mousePos.y);
        } else if (handle.isLeft && !handle.isTop) {
            this.startX = Math.min(this.endX - minSize, mousePos.x);
            this.endY = Math.max(this.startY + minSize, mousePos.y);
        } else {
            this.endX = Math.max(this.startX + minSize, mousePos.x);
            this.endY = Math.max(this.startY + minSize, mousePos.y);
        }
    }

    startDragging(x, y) {
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        
        // Store initial positions as absolute values
        this.initialBoxPosition = {
            startX: this.startX,
            startY: this.startY,
            endX: this.endX,
            endY: this.endY
        };

        // Store initial positions of all selected shapes
        this.initialShapePositions.clear();
        this.selectedShapes.forEach(shape => {
            // Store all relevant coordinates for each shape type
            if (shape.type === 'circle') {
                this.initialShapePositions.set(shape, {
                    centerX: shape.centerX,
                    centerY: shape.centerY,
                    radius: shape.radius
                });
            } else {
                this.initialShapePositions.set(shape, {
                    x1: shape.x1,
                    y1: shape.y1,
                    x2: shape.x2,
                    y2: shape.y2
                });
            }
        });
    }

    updateDrag(x, y) {
        if (!this.isDragging || !this.initialBoxPosition) return null;
        
        // Calculate exact movement delta
        const dx = x - this.dragStartX;
        const dy = y - this.dragStartY;

        // Update selection box using initial position
        this.startX = this.initialBoxPosition.startX + dx;
        this.startY = this.initialBoxPosition.startY + dy;
        this.endX = this.initialBoxPosition.endX + dx;
        this.endY = this.initialBoxPosition.endY + dy;

        // Update all shapes using their initial positions
        this.selectedShapes.forEach(shape => {
            const initialPos = this.initialShapePositions.get(shape);
            if (!initialPos) return;

            if (shape.type === 'circle') {
                shape.centerX = initialPos.centerX + dx;
                shape.centerY = initialPos.centerY + dy;
                // Update bounding box coordinates
                shape.x1 = shape.centerX - initialPos.radius;
                shape.y1 = shape.centerY - initialPos.radius;
                shape.x2 = shape.centerX + initialPos.radius;
                shape.y2 = shape.centerY + initialPos.radius;
            } else {
                shape.x1 = initialPos.x1 + dx;
                shape.y1 = initialPos.y1 + dy;
                shape.x2 = initialPos.x2 + dx;
                shape.y2 = initialPos.y2 + dy;
            }
        });

        // Return movement delta for additional processing if needed
        return { dx, dy };
    }

    stopDragging() {
        this.isDragging = false;
        this.initialShapePositions.clear();
        this.initialBoxPosition = null;
    }

    startResize() {
        // Store initial states of all selected shapes and the selection box
        this.initialShapeStates.clear();
        this.initialBoxBounds = this.getBounds();
        
        this.selectedShapes.forEach(shape => {
            if (shape.type === 'circle') {
                this.initialShapeStates.set(shape, {
                    centerX: shape.centerX,
                    centerY: shape.centerY,
                    radius: shape.radius,
                    type: 'circle'
                });
            } else {
                this.initialShapeStates.set(shape, {
                    x1: shape.x1,
                    y1: shape.y1,
                    x2: shape.x2,
                    y2: shape.y2,
                    type: shape.type
                });
            }
        });
    }

    getInitialState(shape) {
        return this.initialShapeStates.get(shape);
    }

    getInitialGroupBounds() {
        if (this.initialBoxBounds) {
            return this.initialBoxBounds;
        }
        return this.getBounds();
    }

    clearResize() {
        this.initialShapeStates.clear();
        this.initialBoxBounds = null;
    }
}
