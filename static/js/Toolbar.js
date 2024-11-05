export class Toolbar {
    constructor(toolboxElement, canvasManager) {
        this.toolbox = toolboxElement;
        this.canvasManager = canvasManager;
        this.selectedTool = null;
        this.selectedShape = localStorage.getItem('selectedShape');
        this.setupToolHandlers();
        this.restoreSelection();
        this.setupColorPicker();

        // Listen for shape creation to maintain tool state
        this.canvasManager.onShapeCreated = () => {
            this.updateToolbarUI();
        };
    }

    setupToolHandlers() {
        this.toolbox.querySelectorAll('.tool, .shape').forEach(tool => {
            tool.addEventListener('click', () => this.handleToolSelection(tool));
        });
    }

    handleToolSelection(tool) {
        const toolType = tool.dataset.tool || tool.dataset.shape;
        
        if (tool.classList.contains('shape')) {
            this.selectedShape = toolType;
            this.selectedTool = toolType;
            localStorage.setItem('selectedShape', toolType);
        } else {
            this.selectedTool = toolType;
            if (toolType === 'select') {
                // Always clear the current selection when clicking select tool,
                // regardless of whether there was a previous selection
                this.canvasManager.selectionBox.clear();
                this.canvasManager.selectionBox.selectedShapes.clear();
                this.canvasManager.render();
                
                this.selectedShape = null;
                localStorage.removeItem('selectedShape');
            }
        }

        this.updateToolbarUI();
        this.canvasManager.currentTool = this.selectedTool;
        this.canvasManager.canvas.style.cursor = toolType === 'select' ? 'default' : 'crosshair';
    }

    restoreSelection() {
        if (this.selectedShape) {
            const shapeButton = this.toolbox.querySelector(`[data-shape="${this.selectedShape}"]`);
            if (shapeButton) {
                this.handleToolSelection(shapeButton);
                return;
            }
        }
        
        const selectTool = this.toolbox.querySelector('[data-tool="select"]');
        if (selectTool) {
            this.handleToolSelection(selectTool);
        }
    }

    updateToolbarUI() {
        this.toolbox.querySelectorAll('.tool, .shape').forEach(t => {
            const type = t.dataset.tool || t.dataset.shape;
            if (type === this.selectedTool) {
                t.classList.add('active', 'pressed');
            } else {
                t.classList.remove('active', 'pressed');
            }
        });
    }

    setupColorPicker() {
        const colorPicker = document.getElementById('color-picker');
        
        // Update color picker value when selecting shapes
        this.canvasManager.onSelectionChanged = (selectedShapes) => {
            // Convert null/single shape to array and handle null case
            const shapes = selectedShapes ? (Array.isArray(selectedShapes) ? selectedShapes : [selectedShapes]) : [];
            if (shapes.length === 1) {
                colorPicker.value = shapes[0].color;
            }
        };

        // Handle color changes (both click and input events)
        const updateColor = (e) => {
            const newColor = e.target.value;
            // Update color of all selected shapes
            if (this.canvasManager.selectionBox.selectedShapes.size > 0) {
                this.canvasManager.selectionBox.selectedShapes.forEach(shape => {
                    shape.color = newColor;
                });
            }
            // Always update current color for new shapes
            this.canvasManager.currentColor = newColor;
            this.canvasManager.render();
            this.canvasManager.updateCanvasText();
        };

        colorPicker.addEventListener('input', updateColor);
        colorPicker.addEventListener('change', updateColor);
    }
}
