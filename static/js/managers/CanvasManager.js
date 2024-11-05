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
            const previewShape = new Shape(this.currentTool, {
                x: this.state.startPoint.x,
                y: this.state.startPoint.y,
                width: this.state.lastPoint.x - this.state.startPoint.x,
                height: this.state.lastPoint.y - this.state.startPoint.y,
                size: Math.hypot(
                    this.state.lastPoint.x - this.state.startPoint.x,
                    this.state.lastPoint.y - this.state.startPoint.y
                ) / 2,
                x1: this.state.startPoint.x,
                y1: this.state.startPoint.y,
                x2: this.state.lastPoint.x,
                y2: this.state.lastPoint.y,
                color: this.currentColor
            });
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
            case 'circle':
                shape.x += dx;
                shape.y += dy;
                break;
            case 'line':
                shape.x1 += dx;
                shape.y1 += dy;
                shape.x2 += dx;
                shape.y2 += dy;
                break;
        }
    }

    handleMouseDown(e) {
        const mousePos = this.getMousePos(e);
        
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
        }

        if (this.currentTool) {
            this.state.isDrawing = true;
            this.state.startPoint = mousePos;
            this.state.lastPoint = mousePos;
            this.selectionBox.selectedShapes.clear();
        }
    }

    handleMouseMove(e) {
        const mousePos = this.getMousePos(e);
        
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
        }
    }

    handleMouseUp(e) {
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
            let x = this.state.startPoint.x;
            let y = this.state.startPoint.y;
            let width = this.state.lastPoint.x - this.state.startPoint.x;
            let height = this.state.lastPoint.y - this.state.startPoint.y;

            // Normalize rectangle dimensions
            if (width < 0) {
                x += width;
                width = Math.abs(width);
            }
            if (height < 0) {
                y += height;
                height = Math.abs(height);
            }

            const shapeBounds = {
                x: x,
                y: y,
                width: width,
                height: height,
                size: Math.hypot(width, height) / 2,
                x1: this.state.startPoint.x,
                y1: this.state.startPoint.y,
                x2: this.state.lastPoint.x,
                y2: this.state.lastPoint.y,
                color: this.currentColor
            };
            
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

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Apply inverse transform to get the correct mouse position
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: ((e.clientX - rect.left) * scaleX - this.state.translate.x) / this.state.scale,
            y: ((e.clientY - rect.top) * scaleY - this.state.scale)
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
            // Format: type(params) [#color] [r<angle>]
            const color = shape.color !== '#e74c3c' ? ` ${shape.color}` : '';
            const rotation = shape.rotation ? ` r${Math.round(shape.rotation * 180 / Math.PI)}` : '';
            
            let code = '';
            switch(shape.type) {
                case 'rectangle':
                    code = `rect(${Math.round(shape.x)} ${Math.round(shape.y)} ${Math.round(shape.width)} ${Math.round(shape.height)})${color}${rotation}`;
                    break;
                case 'circle':
                    code = `circ(${Math.round(shape.x + shape.size)} ${Math.round(shape.y + shape.size)} ${Math.round(shape.size)})${color}${rotation}`;
                    break;
                case 'triangle':
                    code = `tri(${Math.round(shape.x)} ${Math.round(shape.y)} ${Math.round(shape.width)} ${Math.round(shape.height)})${color}${rotation}`;
                    break;
                case 'line':
                    code = `line(${Math.round(shape.x1)} ${Math.round(shape.y1)} ${Math.round(shape.x2)} ${Math.round(shape.y2)})${color}${rotation}`;
                    break;
            }
            return `// ${shape.type}\n${code}`;
        });
    
        return lines.join('\n');
    }

    applyCanvasText() {
        try {
            const text = this.canvasText.value;
            // Update to handle // comments instead of #
            const lines = text.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
            
            const newShapes = [];
            
            lines.forEach(line => {
                if (line.trim().startsWith('//')) {
                    return;
                }
                
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
                    case 'rect':
                        shape = new Shape('rectangle', {
                            x: values[0],
                            y: values[1],
                            width: values[2],
                            height: values[3],
                            color: shapeColor
                        });
                        break;
                    case 'circ':
                        shape = new Shape('circle', {
                            x: values[0] - values[2],
                            y: values[1] - values[2],
                            size: values[2],
                            color: shapeColor
                        });
                        break;
                    case 'tri':
                        shape = new Shape('triangle', {
                            x: values[0],
                            y: values[1],
                            width: values[2],
                            height: values[3],
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
                
                if (shape) {
                    // Validate shape bounds
                    if (this.isValidShape(shape)) {
                        newShapes.push(shape);
                    } else {
                        console.warn(`Invalid shape bounds: ${line}`);
                    }
                }
            });
            
            // Only update shapes if parsing was successful
            this.shapes = newShapes;
        } catch (error) {
            console.error('Error parsing canvas text:', error);
        }
    }

    isValidShape(shape) {
        // Add basic shape validation
        return shape.x != null && 
               shape.y != null && 
               (shape.width == null || shape.width >= 0) &&
               (shape.height == null || shape.height >= 0) &&
               (shape.size == null || shape.size >= 0);
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
                return point.x >= shape.x && 
                       point.x <= shape.x + shape.width &&
                       point.y >= shape.y && 
                       point.y <= shape.y + shape.height;
            
            case 'circle': {
                const centerX = shape.x + shape.size;
                const centerY = shape.y + shape.size;
                const distance = Math.hypot(point.x - centerX, point.y - centerY);
                return distance <= shape.size;
            }
            
            case 'triangle': {
                // Simplified triangle hit detection using bounding box
                return point.x >= shape.x && 
                       point.x <= shape.x + shape.width &&
                       point.y >= shape.y && 
                       point.y <= shape.y + shape.height;
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
}