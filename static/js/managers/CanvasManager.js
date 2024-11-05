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
        
        // Draw all shapes
        this.shapes.forEach(shape => shape.draw(this.ctx, false));
        
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
        // Ignore right clicks for drawing and selection
        if (e.button === 2) return;
        
        const mousePos = this.getMousePos(e);
        
        // Check for resize handle first, before any other interactions
        if (this.selectionBox.showResizeHandles) {
            const handle = this.selectionBox.getHandleAtPosition(mousePos);
            if (handle) {
                this.selectionBox.setActiveHandle(handle);  // Set active handle
                this.lastMousePos = mousePos;  // Store initial mouse position
                this.canvas.style.cursor = handle.cursor;
                e.preventDefault(); // Prevent other actions
                e.stopPropagation();
                return;
            }
        }
        
        // Only proceed with other actions if we're not resizing
        if (!this.resizeHandle) {
            if (this.currentTool === 'select') {
                // Check if clicking on selection box first
                if (this.selectionBox.containsPoint(mousePos) && this.selectionBox.selectedShapes.size > 0) {
                    this.selectionBox.startDragging(mousePos.x, mousePos.y);
                    return;
                }

                const clickedShape = this.findShapeAtPoint(mousePos);
                
                if (clickedShape) {
                    // Start dragging the clicked shape
                    this.draggedShape = clickedShape;
                    this.dragStartPos = mousePos;
                    
                    // Handle selection
                    if (e.shiftKey) {
                        if (this.selectionBox.selectedShapes.has(clickedShape)) {
                            this.selectionBox.selectedShapes.delete(clickedShape);
                        } else {
                            this.selectionBox.selectedShapes.add(clickedShape);
                        }
                    } else {
                        this.selectionBox.selectedShapes.clear();
                        this.selectionBox.selectedShapes.add(clickedShape);
                    }
                    this.selectionBox.calculateBounds();
                } else {
                    // If clicked empty space, start new selection box
                    if (!this.selectionBox.containsPoint(mousePos)) {
                        this.selectionBox.clear();
                    }
                    this.selectionBox.start(mousePos.x, mousePos.y);
                }
                
                this.render();
                return;
            } else if (this.currentTool) {
                this.state.isDrawing = true;
                this.state.startPoint = mousePos;  // This will be the circle center
                this.state.lastPoint = mousePos;
                if (this.currentTool === 'circle') {
                    this.state.radius = 0;
                }
                this.selectionBox.selectedShapes.clear();
            }
        }
    }

    handleMouseMove(e) {
        if (e.buttons === 2) return;
        const mousePos = this.getMousePos(e);
        
        // Handle resize with active handle
        if (this.selectionBox.activeHandle && this.lastMousePos) {
            const dx = mousePos.x - this.lastMousePos.x;
            const dy = mousePos.y - this.lastMousePos.y;
            
            // Use the isLeft/isTop values from the active handle
            const isLeft = this.selectionBox.activeHandle.isLeft;
            const isTop = this.selectionBox.activeHandle.isTop;
            
            // Apply resizing to all selected shapes
            this.selectionBox.selectedShapes.forEach(shape => {
                this.resizeShape(shape, dx, dy, isLeft, isTop);
            });
            
            // Update selection box
            if (isLeft) {
                this.selectionBox.startX += dx;
            } else {
                this.selectionBox.endX += dx;
            }
            if (isTop) {
                this.selectionBox.startY += dy;
            } else {
                this.selectionBox.endY += dy;
            }
            
            this.lastMousePos = mousePos;
            this.updateCanvasText();
            this.render();
            return;
        }
        
        // Update cursor for resize handles
        if (this.selectionBox.showResizeHandles) {
            const handle = this.selectionBox.getHandleAtPosition(mousePos);
            if (handle) {
                this.canvas.style.cursor = handle.cursor;
                return;
            }
        }

        // Only proceed with other actions if we're not resizing
        if (!this.resizeHandle) {
            if (this.currentTool === 'select') {
                // Handle shape dragging
                if (this.draggedShape) {
                    const dx = mousePos.x - this.dragStartPos.x;
                    const dy = mousePos.y - this.dragStartPos.y;
                    this.moveShape(this.draggedShape, dx, dy);
                    this.dragStartPos = mousePos;
                    this.selectionBox.calculateBounds();
                    this.updateCanvasText();
                    this.render();
                    return;
                }

                // Check for selection box dragging first
                if (this.selectionBox.isDragging) {
                    const { dx, dy } = this.selectionBox.updateDrag(mousePos.x, mousePos.y);
                    
                    // Move all selected shapes along with the selection box
                    this.selectionBox.selectedShapes.forEach(shape => {
                        if (shape.type === 'circle') {
                            shape.x += dx;
                            shape.y += dy;
                        } else {
                            shape.x1 += dx;
                            shape.y1 += dy;
                            shape.x2 += dx;
                            shape.y2 += dy;
                        }
                    });
                    
                    this.updateCanvasText();
                    this.render();
                    return;
                }

                const hoveredShape = this.findShapeAtPoint(mousePos);
                
                // Show move cursor if:
                // 1. Mouse is over the selection box with selected shapes, or
                // 2. Mouse is over a selected shape, or
                // 3. Mouse is over any shape that's currently selected
                if ((this.selectionBox.containsPoint(mousePos) && this.selectionBox.selectedShapes.size > 0) ||
                    (hoveredShape && this.selectionBox.selectedShapes.has(hoveredShape))) {
                    this.canvas.style.cursor = 'move';
                } else if (hoveredShape) {
                    this.canvas.style.cursor = 'pointer';
                } else {
                    this.canvas.style.cursor = 'default';
                }

                if (this.selectionBox.isDragging) {
                    const { dx, dy } = this.selectionBox.updateDrag(mousePos.x, mousePos.y);
                    // Move all selected shapes
                    this.selectionBox.selectedShapes.forEach(shape => {
                        this.moveShape(shape, dx, dy);
                    });
                    this.updateCanvasText(); // Update code view
                    this.render();
                    return;
                }

                if (this.selectionBox.isActive) {
                    this.selectionBox.update(mousePos.x, mousePos.y);
                    
                    if (!e.shiftKey) {
                        this.selectionBox.selectedShapes.clear();
                    }
                    
                    this.shapes.forEach(shape => {
                        if (this.selectionBox.isShapeFullyInBox(shape)) {
                            this.selectionBox.selectedShapes.add(shape);
                        }
                    });
                    
                    this.render();
                }
                return;
            }

            if (this.state.isDrawing) {
                this.state.lastPoint = this.getMousePos(e);
                if (this.currentTool === 'circle') {
                    // Calculate radius based on distance from initial click
                    this.state.radius = Math.hypot(
                        mousePos.x - this.state.startPoint.x,
                        mousePos.y - this.state.startPoint.y
                    );
                }
            }
        }
    }

    handleMouseUp(e) {
        // Ignore right button mouseup
        if (e.button === 2) return;
        
        // Clear active handle state
        if (this.selectionBox.activeHandle) {
            this.selectionBox.clearActiveHandle();
            this.lastMousePos = null;
            this.canvas.style.cursor = 'default';
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // Only proceed with other actions if we weren't resizing
        if (!this.resizeHandle) {
            if (this.currentTool === 'select') {
                // Reset dragging state
                this.draggedShape = null;
                this.dragStartPos = null;

                if (this.selectionBox.isDragging) {
                    this.selectionBox.stopDragging();
                    return;
                }
                if (this.selectionBox.selectedShapes.size > 0) {
                    this.selectionBox.calculateBounds();
                } else {
                    this.selectionBox.clear();
                }
                this.selectionBox.stop();
                this.render();
                return;
            }

            if (this.state.isDrawing && this.state.startPoint && this.state.lastPoint) {
                let shapeBounds;
                
                if (this.currentTool === 'circle') {
                    // Create final circle using center point and radius
                    const radius = Math.hypot(
                        this.state.lastPoint.x - this.state.startPoint.x,
                        this.state.lastPoint.y - this.state.startPoint.y
                    );
                    shapeBounds = {
                        centerX: this.state.startPoint.x,
                        centerY: this.state.startPoint.y,
                        radius: radius,
                        color: this.currentColor
                    };
                } else {
                    // Fix: Use the same coordinate system for final shape as preview
                    shapeBounds = {
                        x1: Math.min(this.state.startPoint.x, this.state.lastPoint.x),
                        y1: Math.min(this.state.startPoint.y, this.state.lastPoint.y),
                        x2: Math.max(this.state.startPoint.x, this.state.lastPoint.x),
                        y2: Math.max(this.state.lastPoint.y, this.state.lastPoint.y),
                        color: this.currentColor
                    };
                }
                
                const newShape = new Shape(this.currentTool, shapeBounds);
                this.shapes.push(newShape);
                
                // Select the newly created shape
                this.selectionBox.selectedShapes.clear();
                this.selectionBox.selectedShapes.add(newShape);
                this.selectionBox.calculateBounds();
                
                this.updateCanvasText();
            }
            this.state.reset();
        }
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
                            y2: values[3],
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

    resizeShape(shape, dx, dy, isLeft, isTop) {
        switch(shape.type) {
            case 'circle': {
                if (this.selectionBox.activeHandle?.isCircleHandle) {
                    // Get the new handle position after movement
                    const handle = this.selectionBox.activeHandle;
                    const handlePos = {
                        x: handle.x + dx,
                        y: handle.y + dy
                    };
                    
                    // Calculate new radius as distance from center to new handle position
                    const newRadius = Math.hypot(
                        handlePos.x - shape.centerX,
                        handlePos.y - shape.centerY
                    );
                    
                    // Update shape radius with minimum size limit
                    shape.radius = Math.max(1, newRadius);
                    
                    // Update bounding box coordinates
                    shape.x1 = shape.centerX - shape.radius;
                    shape.y1 = shape.centerY - shape.radius;
                    shape.x2 = shape.centerX + shape.radius;
                    shape.y2 = shape.centerY + shape.radius;
                    
                    // Update handle position in selection box
                    handle.x = handlePos.x;
                    handle.y = handlePos.y;
                    
                    // Update selection box bounds
                    this.selectionBox.startX = shape.x1 - 5; // 5px padding
                    this.selectionBox.startY = shape.y1 - 5;
                    this.selectionBox.endX = shape.x2 + 5;
                    this.selectionBox.endY = shape.y2 + 5;
                }
                break;
            }
            
            case 'rectangle':
            case 'triangle': {
                if (isLeft && isTop) {
                    shape.x1 += dx;
                    shape.y1 += dy;
                } else if (!isLeft && isTop) {
                    shape.x2 += dx;
                    shape.y1 += dy;
                } else if (isLeft && !isTop) {
                    shape.x1 += dx;
                    shape.y2 += dy;
                } else {
                    shape.x2 += dx;
                    shape.y2 += dy;
                }
                break;
            }
            
            case 'line': {
                if (isLeft) {
                    shape.x1 += dx;
                    shape.y1 += dy;
                } else {
                    shape.x2 += dx;
                    shape.y2 += dy;
                }
                break;
            }
        }
    }
}