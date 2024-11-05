import { CanvasManager } from './managers/CanvasManager.js';
import { Toolbar } from './Toolbar.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('canvas-container');
    const manager = new CanvasManager(canvas, container);
    const toolbar = new Toolbar(document.getElementById('toolbox'), manager);
});
