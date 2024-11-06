import { Shape } from '../Shape.js';
import { DrawingState } from '../DrawingState.js';
import { SelectionBox } from '../SelectionBox.js';
import { KeyboardManager } from './KeyboardManager.js';

export class CanvasManager {
    constructor(canvasElement, containerElement) {
        this.canvas = canvasElement;
        this.container = containerElement;
        this.ctx = this.canvas.getContext('2d');
        this.shapes = [];
        this.currentTool = null;
        this.state = new DrawingState();
        this.currentColor = '#e74c3c';
        this.canvasText = document.getElementById('canvas-text');
        this.applyButton = document.getElementById('apply-code');
        this.selectionBox = new SelectionBox();
        this.draggedShape = null;  // Add this line
        this.dragStartPos = null;  // Add this line
        this.keyboardManager = new KeyboardManager(this);
        this.resizeHandle = null;
        this.lastMousePos = null;  // Add this line

        this.setupEventListeners();
        this.resizeCanvas();
        this.updateCanvasText();
        this.startDrawLoop();
    }

    resizeCanvas() {
        this.canvas.width = this.container.clientWidth;
        this.canvas.height = this.container.clientHeight;
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        this.applyButton.addEventListener('click', this.applyCanvasText.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }

    startDrawLoop() {
        const draw = () => {
            this.render();
            requestAnimationFrame(draw);
        };
        draw();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        
        // Draw all shapes, passing their selection state
        this.shapes.forEach(shape => {
            const isSelected = this.selectionBox.selectedShapes.has(shape) || 
                             this.selectionBox.isShapeFullyInBox(shape);
            shape.draw(this.ctx, isSelected);
        });
        
        // Draw shape preview while drawing
        if (this.state.isDrawing && this.state.startPoint && this.state.lastPoint) {
            let previewShape;
            if (this.currentTool === 'circle') {
                // Use initial click as center, current mouse position determines radius
                const radius = Math.hypot(
                    this.state.lastPoint.x - this.state.startPoint.x,
                    this.state.lastPoint.y - this.state.startPoint.y
                );
                previewShape = new Shape('circle', {
                    centerX: this.state.startPoint.x,
                    centerY: this.state.startPoint.y,
                    radius: radius,
                    color: this.currentColor
                });
            } else if (this.currentTool === 'triangle') {
                // Calculate height and side length for isosceles triangle
                const dx = this.state.lastPoint.x - this.state.startPoint.x;
                const dy = this.state.lastPoint.y - this.state.startPoint.y;
                const height = Math.abs(dy);
                const sideLength = Math.hypot(dx, dy); // Length of the sides
                
                // Calculate base width to maintain equal sides
                const baseWidth = sideLength * 1.15; // Slightly wider base for stability
                
                previewShape = new Shape('triangle', {
                    // Center the base around the start point
                    x1: this.state.startPoint.x - baseWidth/2,
                    // Top point is always the minimum y
                    y1: Math.min(this.state.startPoint.y, this.state.lastPoint.y),
                    // Right point of base
                    x2: this.state.startPoint.x + baseWidth/2,
                    // Bottom is always the maximum y
                    y2: Math.max(this.state.startPoint.y, this.state.lastPoint.y),
                    color: this.currentColor
                });
            } else {
                previewShape = new Shape(this.currentTool, {
                    x1: this.state.startPoint.x,
                    y1: this.state.startPoint.y,
                    x2: this.state.lastPoint.x,
                    y2: this.state.lastPoint.y,
                    color: this.currentColor
                });
            }
            previewShape.draw(this.ctx, false);
        }

        // Draw selection box
        this.selectionBox.draw(this.ctx);
        
        this.ctx.restore();
    }

    moveShape(shape, dx, dy) {
        switch(shape.type) {
            case 'rectangle':
            case 'triangle':
            case 'line':
                shape.x1 += dx;
                shape.y1 += dy;
                shape.x2 += dx;
                shape.y2 += dy;
                break;
            case 'circle':
                shape.centerX += dx;
                shape.centerY += dy;
                // Update bounds
                shape.x1 = shape.centerX - shape.radius;
                shape.y1 = shape.centerY - shape.radius;
                shape.x2 = shape.centerX + shape.radius;
                shape.y2 = shape.centerY + shape.radius;
                break;
        }
    }

    handleMouseDown(e) {
        if (e.button === 2) return;
        
        const mousePos = this.getMousePos(e);
        
        // Check for resize handle first, before any other interactions
        if (this.selectionBox.showResizeHandles) {
            const handle = this.selectionBox.getHandleAtPosition(mousePos);
            if (handle) {
                this.state.isResizing = true;  // Set resize state
                this.selectionBox.setActiveHandle(handle);
                this.selectionBox.startResize(); // Add this line
                this.lastMousePos = mousePos;
                this.canvas.style.cursor = handle.cursor;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }

        if (this.currentTool === 'select') {
            // First check if we clicked a shape
            const clickedShape = this.findShapeAtPoint(mousePos);
            
            // Hide resize handles when starting new selection
            this.selectionBox.showResizeHandles = false;

            // Check if clicking inside selection box
            if (this.selectionBox.containsPoint(mousePos) && this.selectionBox.selectedShapes.size > 0) {
                this.state.isDragging = true;
                this.dragStartPos = mousePos;
                this.selectionBox.startDragging(mousePos.x, mousePos.y);
                this.canvas.style.cursor = 'grabbing';
                return;
            }
            
            if (clickedShape) {
                // Only modify selection if:
                // 1. Shape is not already selected, or
                // 2. Shift key is pressed
                if (!this.selectionBox.selectedShapes.has(clickedShape) || e.shiftKey) {
                    // If shift is not held and shape isn't selected, clear previous selection
                    if (!e.shiftKey && !this.selectionBox.selectedShapes.has(clickedShape)) {
                        this.selectionBox.selectedShapes.clear();
                    }
                    
                    // Toggle the clicked shape's selection when using shift
                    if (e.shiftKey) {
                        if (this.selectionBox.selectedShapes.has(clickedShape)) {
                            this.selectionBox.selectedShapes.delete(clickedShape);
                        } else {
                            this.selectionBox.selectedShapes.add(clickedShape);
                        }
                    } else {
                        this.selectionBox.selectedShapes.add(clickedShape);
                    }
                }
                
                // Start dragging setup
                this.draggedShape = clickedShape;
                this.dragStartPos = mousePos;
                
                // Update selection box
                if (this.selectionBox.selectedShapes.size > 0) {
                    this.selectionBox.calculateBounds();
                } else {
                    this.selectionBox.clear();
                }
                
                this.render();
                return;
            }
            
            // If we didn't click a shape, start a new selection box
            this.selectionBox.clear();
            this.selectionBox.showResizeHandles = false;
            this.selectionBox.start(mousePos.x, mousePos.y);
            this.state.isSelecting = true;
        } else if (this.currentTool) {
            // Clear selection when starting to draw
            this.selectionBox.clear();
            this.selectionBox.showResizeHandles = false;
            this.state.isDrawing = true;
            this.state.startPoint = mousePos;
            this.state.lastPoint = mousePos;
        }
    }

    handleMouseMove(e) {
        if (e.buttons === 2) return;
        const mousePos = this.getMousePos(e);

        // Handle selection box dragging
        if (this.state.isDragging && this.dragStartPos) {
            const movement = this.selectionBox.updateDrag(mousePos.x, mousePos.y);
            if (movement) {
                this.updateCanvasText();
                this.render();
            }
            return;
        }

        // Handle resize state - Modified section
        if (this.state.isResizing && this.selectionBox.activeHandle) {
            // Update bounds directly based on mouse position
            this.selectionBox.resizeByHandle(this.selectionBox.activeHandle, mousePos);
            
            this.lastMousePos = mousePos;
            this.selectionBox.calculateBounds();
            this.updateCanvasText();
            this.render();
            return;
        }

        // Handle dragging - single shape or selection box
        if (this.draggedShape && this.dragStartPos) {
            const dx = mousePos.x - this.dragStartPos.x;
            const dy = mousePos.y - this.dragStartPos.y;

            // Move the shape
            this.moveShape(this.draggedShape, dx, dy);
            
            // Update the selection box to follow the shape
            this.selectionBox.calculateBounds();
            
            // Update drag start position for next move
            this.dragStartPos = mousePos;
            
            // Update canvas
            this.updateCanvasText();
            this.render();
            return;
        }

        // Handle selection box dragging
        if (this.state.isDragging && this.dragStartPos) {
            const movement = this.selectionBox.updateDrag(mousePos.x, mousePos.y);
            if (movement) {
                // Move all selected shapes
                this.selectionBox.selectedShapes.forEach(shape => {
                    this.moveShape(shape, movement.dx, movement.dy);
                });
                this.updateCanvasText();
                this.render();
            }
            return;
        }

        // Set cursor based on current action or hover state
        if (this.currentTool === 'select') {
            // Check resize handles first
            if (this.selectionBox.showResizeHandles) {
                const handle = this.selectionBox.getHandleAtPosition(mousePos);
                if (handle) {
                    this.canvas.style.cursor = handle.cursor;
                } else if (this.selectionBox.containsPoint(mousePos) && this.selectionBox.selectedShapes.size > 0) {
                    // Change to grab cursor when hovering over selection box
                    this.canvas.style.cursor = this.state.isDragging ? 'grabbing' : 'grab';
                } else {
                    this.canvas.style.cursor = 'default';
                }
            } else {
                // Check if hovering over selection box or selected shapes
                if (this.selectionBox.containsPoint(mousePos) && this.selectionBox.selectedShapes.size > 0) {
                    this.canvas.style.cursor = this.state.isDragging ? 'grabbing' : 'grab';
                } else {
                    // Check if hovering over any shape
                    const hoverShape = this.findShapeAtPoint(mousePos);
                    if (hoverShape && this.selectionBox.selectedShapes.has(hoverShape)) {
                        this.canvas.style.cursor = this.state.isDragging ? 'grabbing' : 'grab';
                    } else if (hoverShape) {
                        this.canvas.style.cursor = 'pointer';
                    } else {
                        this.canvas.style.cursor = 'default';
                    }
                }
            }

            // Ensure grabbing cursor while actively dragging
            if (this.state.isDragging || this.draggedShape) {
                this.canvas.style.cursor = 'grabbing';
            }
        } else {
            this.canvas.style.cursor = 'crosshair';
        }

        // Rest of your existing handleMouseMove code...
        if (this.state.isDragging && this.dragStartPos) {
            this.canvas.style.cursor = 'move'; // Ensure move cursor while dragging
            // ... rest of dragging code
        }
        // ... rest of the method

        if (this.state.isDragging && this.dragStartPos) {
            // Calculate the movement delta
            const dx = mousePos.x - this.dragStartPos.x;
            const dy = mousePos.y - this.dragStartPos.y;
            
            // Move all selected shapes
            this.selectionBox.selectedShapes.forEach(shape => {
                this.moveShape(shape, dx, dy);
            });
            
            // Update selection box position
            this.selectionBox.startX += dx;
            this.selectionBox.startY += dy;
            this.selectionBox.endX += dx;
            this.selectionBox.endY += dy;
            
            // Update drag start position
            this.dragStartPos = mousePos;
            
            this.updateCanvasText();
            this.render();
            return;
        }

        if (this.state.isSelecting) {
            // Update selection box as mouse moves
            this.selectionBox.update(mousePos.x, mousePos.y);
            this.render();
            return;
        }
        // ...rest of handleMouseMove code...
        // Handle resize first
        if (this.selectionBox.activeHandle && this.lastMousePos) {
            // ... existing resize handling ...
            return;
        }

        if (this.currentTool === 'select') {
            // Handle selection box dragging first
            if (this.selectionBox.isDragging) {
                this.selectionBox.updateDrag(mousePos.x, mousePos.y);
                this.updateCanvasText();
                this.render();
                return;
            }

            // Handle individual shape dragging
            if (this.draggedShape && this.dragStartPos) {
                const dx = mousePos.x - this.dragStartPos.x;
                const dy = mousePos.y - this.dragStartPos.y;
                
                if (this.selectionBox.selectedShapes.has(this.draggedShape)) {
                    // If dragged shape is part of selection, move all selected shapes
                    this.selectionBox.isDragging = true;
                    this.selectionBox.dragStartX = this.dragStartPos.x;
                    this.selectionBox.dragStartY = this.dragStartPos.y;
                    this.selectionBox.updateDrag(mousePos.x, mousePos.y);
                } else {
                    // Move individual shape
                    this.moveShape(this.draggedShape, dx, dy);
                }
                
                this.dragStartPos = mousePos;
                this.selectionBox.calculateBounds();
                this.updateCanvasText();
                this.render();
                return;
            }

            // ... rest of mouse move handling ...
        } else if (this.state.isDrawing) {
            // Update last point for shape preview
            this.state.lastPoint = mousePos;
            if (this.currentTool === 'circle') {
                // Update radius for circle preview
                this.state.radius = Math.hypot(
                    mousePos.x - this.state.startPoint.x,
                    mousePos.y - this.state.startPoint.y
                );
            }
            // Force a render to show the preview
            this.render();
        }

        // Set appropriate cursor
        if (this.currentTool === 'select') {
            if (this.selectionBox.showResizeHandles) {
                const handle = this.selectionBox.getHandleAtPosition(mousePos);
                this.canvas.style.cursor = handle ? handle.cursor : 'default';
            } else {
                this.canvas.style.cursor = 'default';
            }
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    handleMouseUp(e) {
        if (e.button === 2) return;
        
        // Clear resize state
        if (this.state.isResizing) {
            this.state.isResizing = false;
            this.selectionBox.clearResize();
            this.selectionBox.clearActiveHandle();
            this.lastMousePos = null;
            this.canvas.style.cursor = 'default';
            return;
        }

        // Handle drag state
        if (this.state.isDragging) {
            this.state.isDragging = false;
            this.dragStartPos = null;
            this.selectionBox.stopDragging();
            this.canvas.style.cursor = 'default';
            return;
        }
        
        // Handle selection state
        if (this.state.isSelecting) {
            // Find all shapes within selection box
            this.shapes.forEach(shape => {
                if (this.selectionBox.isShapeFullyInBox(shape)) {
                    this.selectionBox.selectedShapes.add(shape);
                }
            });
            
            this.state.isSelecting = false;
            
            // If no shapes were selected, clear the selection box
            if (this.selectionBox.selectedShapes.size === 0) {
                this.selectionBox.clear();
            } else {
                this.selectionBox.calculateBounds();
                this.selectionBox.showResizeHandles = false;
            }
            
            this.render();
            return;
        }

        // Handle other states (drawing, etc.)
        if (this.currentTool === 'select') {
            this.draggedShape = null;
            this.dragStartPos = null;
            this.selectionBox.stop();
            this.render();
        } else if (this.state.isDrawing && this.state.startPoint && this.state.lastPoint) {
            // Check if shape has minimum size before creating
            const dx = this.state.lastPoint.x - this.state.startPoint.x;
            const dy = this.state.lastPoint.y - this.state.startPoint.y;
            const size = Math.hypot(dx, dy);
            
            // Minimum sizes for different shape types
            const minSizes = {
                circle: 5,    // Minimum radius
                rectangle: 5, // Minimum width/height
                triangle: 5,  // Minimum width/height
                line: 5      // Minimum length
            };

            const minSize = minSizes[this.currentTool] || 5;
            
            // Only create shape if it meets minimum size requirements
            if (size >= minSize) {
                let shapeBounds;
                
                if (this.currentTool === 'circle') {
                    const radius = size;
                    shapeBounds = {
                        centerX: this.state.startPoint.x,
                        centerY: this.state.startPoint.y,
                        radius: radius,
                        color: this.currentColor
                    };
                } else if (this.currentTool === 'triangle') {
                    const dx = this.state.lastPoint.x - this.state.startPoint.x;
                    const dy = this.state.lastPoint.y - this.state.startPoint.y;
                    const height = Math.abs(dy);
                    const sideLength = Math.hypot(dx, dy);
                    const baseWidth = sideLength * 1.15; // Same ratio as preview
                    
                    shapeBounds = {
                        x1: this.state.startPoint.x - baseWidth/2,
                        y1: Math.min(this.state.startPoint.y, this.state.lastPoint.y),
                        x2: this.state.startPoint.x + baseWidth/2,
                        y2: Math.max(this.state.startPoint.y, this.state.lastPoint.y),
                        color: this.currentColor
                    };
                } else {
                    // For other shapes, ensure minimum width/height
                    const width = Math.abs(this.state.lastPoint.x - this.state.startPoint.x);
                    const height = Math.abs(this.state.lastPoint.y - this.state.startPoint.y);
                    
                    if (width >= minSize || height >= minSize) {
                        shapeBounds = {
                            x1: Math.min(this.state.startPoint.x, this.state.lastPoint.x),
                            y1: Math.min(this.state.startPoint.y, this.state.lastPoint.y),
                            x2: Math.max(this.state.startPoint.x, this.state.lastPoint.x),
                            y2: Math.max(this.state.lastPoint.y, this.state.lastPoint.y),
                            color: this.currentColor
                        };
                    }
                }
                
                if (shapeBounds) {
                    const newShape = new Shape(this.currentTool, shapeBounds);
                    this.shapes.push(newShape);
                    this.updateCanvasText();
                }
            }
        }
        
        this.state.reset();
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Apply inverse transform to get the correct mouse position
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: ((e.clientX - rect.left) * scaleX - this.state.translate.x) / this.state.scale,
            // Fixed y-coordinate calculation
            y: ((e.clientY - rect.top) * scaleY - this.state.translate.y) / this.state.scale
        };
    }

    setColor(color) {
        this.currentColor = color;
        this.updateCanvasText();
    }

    updateCanvasText() {
        this.canvasText.value = this.generateCanvasCode();
    }

    generateCanvasCode() {
        if (this.shapes.length === 0) {
            return '// Empty canvas';
        }
    
        const lines = this.shapes.map(shape => {
            const color = shape.color !== '#e74c3c' ? ` ${shape.color}` : '';
            const rotation = shape.rotation ? ` r${Math.round(shape.rotation * 180 / Math.PI)}` : '';
            
            let code = '';
            switch(shape.type) {
                case 'circle':
                    code = `circle(${Math.round(shape.centerX)} ${Math.round(shape.centerY)} ${Math.round(shape.radius)})${color}${rotation}`;
                    break;
                case 'rectangle':
                    code = `rect(${Math.round(shape.x1)} ${Math.round(shape.y1)} ${Math.round(shape.x2)} ${Math.round(shape.y2)})${color}${rotation}`;
                    break;
                case 'triangle':
                case 'line':
                    code = `${shape.type}(${Math.round(shape.x1)} ${Math.round(shape.y1)} ${Math.round(shape.x2)} ${Math.round(shape.y2)})${color}${rotation}`;
                    break;
            }
            return `// ${shape.type}\n${code}`;
        });
    
        return lines.join('\n');
    }

    applyCanvasText() {
        try {
            const text = this.canvasText.value;
            const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
            
            const newShapes = [];
            
            lines.forEach(line => {
                if (line.trim().startsWith('//')) return;
                
                const match = line.match(/(\w+)\(([^)]+)\)(?:\s+([#\w]+))?(?:\s+r(-?\d+))?/);
                if (!match) {
                    console.warn(`Invalid shape format: ${line}`);
                    return;
                }
                
                const [_, type, params, color, rotation] = match;
                const values = params.split(/\s+/).map(Number);
                
                let shape;
                const shapeColor = color || '#e74c3c';
                
                switch(type) {
                    case 'circle':
                        shape = new Shape('circle', {
                            centerX: values[0],
                            centerY: values[1],
                            radius: values[2],
                            color: shapeColor
                        });
                        break;
                    case 'rect':
                        shape = new Shape('rectangle', {
                            x1: values[0],
                            y1: values[1],
                            x2: values[2],
                            y2: values[3],
                            color: shapeColor
                        });
                        break;
                    case 'tri':
                        shape = new Shape('triangle', {
                            x1: values[0],
                            y1: values[1],
                            x2: values[2],
                            y2: values[3],
                            color: shapeColor
                        });
                        break;
                    case 'line':
                        shape = new Shape('line', {
                            x1: values[0],
                            y1: values[1],
                            x2: values[2],
                            y3: values[3],
                            color: shapeColor
                        });
                        break;
                }

                if (shape && rotation) {
                    shape.rotation = Number(rotation) * Math.PI / 180;
                }

                if (shape && this.isValidShape(shape)) {
                    newShapes.push(shape);
                }
            });
            
            // Only update shapes if we have valid shapes
            if (newShapes.length > 0) {
                this.shapes = newShapes;
                this.render();
            }
        } catch (error) {
            console.error('Error parsing canvas text:', error);
        }
    }

    isValidShape(shape) {
        return shape.x1 != null && shape.y1 != null && 
               shape.x2 != null && shape.y2 != null;
    }

    findShapeAtPoint(point) {
        // Search shapes in reverse order (top to bottom)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (this.isPointInShape(point, shape)) {
                return shape;
            }
        }
        return null;
    }

    isPointInShape(point, shape) {
        switch(shape.type) {
            case 'rectangle':
            case 'triangle':
                return point.x >= Math.min(shape.x1, shape.x2) && 
                       point.x <= Math.max(shape.x1, shape.x2) &&
                       point.y >= Math.min(shape.y1, shape.y2) && 
                       point.y <= Math.max(shape.y1, shape.y2);
            
            case 'circle': {
                const distance = Math.hypot(
                    point.x - shape.centerX,
                    point.y - shape.centerY
                );
                return distance <= shape.radius;
            }
            
            case 'triangle': {
                // Simplified triangle hit detection using bounding box
                return point.x >= shape.x1 && 
                       point.x <= shape.x2 &&
                       point.y >= shape.y1 && 
                       point.y <= shape.y2;
            }
            
            case 'line': {
                // Check if point is close to the line
                const lineDistance = this.pointToLineDistance(
                    point, 
                    {x: shape.x1, y: shape.y1}, 
                    {x: shape.x2, y: shape.y2}
                );
                return lineDistance < 5; // 5px tolerance
            }
        }
        return false;
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        const numerator = Math.abs(
            (lineEnd.y - lineStart.y) * point.x -
            (lineEnd.x - lineStart.x) * point.y +
            lineEnd.x * lineStart.y -
            lineEnd.y * lineStart.x
        );
        const denominator = Math.hypot(
            lineEnd.y - lineStart.y,
            lineEnd.x - lineStart.x
        );
        return numerator / denominator;
    }

    handleContextMenu(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        const mousePos = this.getMousePos(e);
        
        // Remove any existing context menus first
        document.querySelectorAll('.context-menu').forEach(m => m.remove());
        
        if (this.selectionBox.containsPoint(mousePos) && this.selectionBox.selectedShapes.size > 0) {
            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.style.position = 'absolute';
            menu.style.left = `${e.clientX}px`;
            menu.style.top = `${e.clientY}px`;
            menu.style.display = 'block';
            menu.innerHTML = `
                <div class="menu-item" data-action="resize">Resize</div>
            `;

            // Add event listeners
            menu.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const action = e.target.dataset.action;
                if (action === 'resize') {
                    this.selectionBox.showResizeHandles = true;
                    this.render();
                }
                menu.remove();
            });

            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            // Add the click listener with a small delay to prevent immediate closing
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 0);

            document.body.appendChild(menu);
        }
    }
}