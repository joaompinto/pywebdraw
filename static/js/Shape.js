export class Shape {
    constructor(type, props) {
        this.type = type;
        this.color = props.color || '#e74c3c';
        this.rotation = props.rotation || 0;

        if (type === 'circle') {
            // Circle uses centerX, centerY, radius
            this.centerX = props.centerX;
            this.centerY = props.centerY;
            this.radius = props.radius;
            // Also store bounds for selection box
            this.x1 = this.centerX - this.radius;
            this.y1 = this.centerY - this.radius;
            this.x2 = this.centerX + this.radius;
            this.y2 = this.centerY + this.radius;
        } else {
            // Other shapes use absolute coordinates
            this.x1 = props.x1;
            this.y1 = props.y1;
            this.x2 = props.x2;
            this.y2 = props.y2;
        }
    }

    draw(ctx, isSelected) {
        ctx.save();
        
        // Draw selection border if shape is selected
        if (isSelected) {
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            switch(this.type) {
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'rectangle':
                    ctx.strokeRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
                    break;
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(this.x1 + (this.x2 - this.x1)/2, this.y1);
                    ctx.lineTo(this.x1, this.y2);
                    ctx.lineTo(this.x2, this.y2);
                    ctx.closePath();
                    ctx.stroke();
                    break;
                case 'line':
                    ctx.beginPath();
                    ctx.moveTo(this.x1, this.y1);
                    ctx.lineTo(this.x2, this.y2);
                    ctx.stroke();
                    break;
            }
        }
        
        // Draw the actual shape
        ctx.setLineDash([]); // Reset dash pattern
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 2;

        switch(this.type) {
            case 'rectangle': {
                ctx.fillRect(this.x1, this.y1, this.x2 - this.x1, this.y2 - this.y1);
                break;
            }
            case 'circle': {
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'triangle': {
                ctx.beginPath();
                // x1,y1 is the top point
                // x2,y2 defines the base width and bottom
                const baseWidth = Math.abs(this.x2 - this.x1);
                const centerX = this.x1 + baseWidth/2;
                ctx.moveTo(centerX, this.y1);  // Top point
                ctx.lineTo(this.x1, this.y2);  // Left base point
                ctx.lineTo(this.x2, this.y2);  // Right base point
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'line': {
                ctx.beginPath();
                ctx.moveTo(this.x1, this.y1);
                ctx.lineTo(this.x2, this.y2);
                ctx.stroke();
                break;
            }
        }
        
        ctx.restore();
    }

    resize(mouseX, mouseY, handle, groupBounds) {
        if (this.type === 'circle' && handle.isCircleHandle) {
            this.resizeCircle(mouseX, mouseY);
        } else {
            this.resizeWithinGroup(mouseX, mouseY, handle, groupBounds);
        }
    }

    resizeCircle(mouseX, mouseY) {
        // Calculate new radius based on distance from center to mouse position
        const dx = mouseX - this.centerX;
        const dy = mouseY - this.centerY;
        const newRadius = Math.max(5, Math.hypot(dx, dy)); // Ensure minimum radius of 5
        
        // Only update if we have a valid radius
        if (newRadius > 0) {
            this.radius = newRadius;
            
            // Update bounding box
            this.x1 = this.centerX - this.radius;
            this.y1 = this.centerY - this.radius;
            this.x2 = this.centerX + this.radius;
            this.y2 = this.centerY + this.radius;
        }
    }

    resizeWithinGroup(mouseX, mouseY, handle, groupBounds) {
        const scaleX = handle.isLeft ? 
            (groupBounds.right - mouseX) / (groupBounds.right - groupBounds.left) : 
            (mouseX - groupBounds.left) / (groupBounds.right - groupBounds.left);
            
        const scaleY = handle.isTop ? 
            (groupBounds.bottom - mouseY) / (groupBounds.bottom - groupBounds.top) : 
            (mouseY - groupBounds.top) / (groupBounds.bottom - groupBounds.top);

        // Ensure positive scale factors
        const safeScaleX = Math.max(0.1, Math.abs(scaleX));
        const safeScaleY = Math.max(0.1, Math.abs(scaleY));

        if (this.type === 'circle') {
            this.centerX = groupBounds.left + (this.centerX - groupBounds.left) * safeScaleX;
            this.centerY = groupBounds.top + (this.centerY - groupBounds.top) * safeScaleY;
            
            // Ensure minimum radius of 5
            this.radius = Math.max(5, this.radius * (safeScaleX + safeScaleY) / 2);
            
            // Update bounding box
            this.x1 = this.centerX - this.radius;
            this.y1 = this.centerY - this.radius;
            this.x2 = this.centerX + this.radius;
            this.y2 = this.centerY + this.radius;
        } else {
            // Resize other shapes using their coordinates
            this.x1 = groupBounds.left + (this.x1 - groupBounds.left) * safeScaleX;
            this.y1 = groupBounds.top + (this.y1 - groupBounds.top) * safeScaleY;
            this.x2 = groupBounds.left + (this.x2 - groupBounds.left) * safeScaleX;
            this.y2 = groupBounds.top + (this.y2 - groupBounds.top) * safeScaleY;
        }
    }
}