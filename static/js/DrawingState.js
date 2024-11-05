export class DrawingState {
    constructor() {
        this.reset();
        this.translate = { x: 0, y: 0 };
        this.scale = 1;
    }

    reset() {
        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.isSelecting = false;
        this.isGroupRotating = false;
        this.isGroupResize = false;
        this.startPoint = null;
        this.lastPoint = null;
        this.selectionStart = null;
        this.selectionEnd = null;
        this.resizeHandle = null;
        this.resizeRotation = 0;
        this.rotationCenter = null;
        this.lastRotationAngle = 0;
        this.groupRotationCenter = null;
        this.lastGroupRotationAngle = 0;
        this.dragOffsets = null;
    }
}
