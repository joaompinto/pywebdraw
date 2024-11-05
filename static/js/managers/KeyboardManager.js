export class KeyboardManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(e) {
        if (e.key === 'Delete') {
            this.handleDelete();
        }
    }

    handleDelete() {
        // Get selected shapes from selection box
        const selectedShapes = this.canvasManager.selectionBox.selectedShapes;
        if (selectedShapes.size === 0) return;

        // Remove selected shapes from shapes array
        this.canvasManager.shapes = this.canvasManager.shapes.filter(
            shape => !selectedShapes.has(shape)
        );

        // Clear selection
        this.canvasManager.selectionBox.clear();
        
        // Update canvas
        this.canvasManager.updateCanvasText();
        this.canvasManager.render();
    }
}
