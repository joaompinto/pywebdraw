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
                ctx.moveTo(this.x1 + (this.x2 - this.x1)/2, this.y1);
                ctx.lineTo(this.x1, this.y2);
                ctx.lineTo(this.x2, this.y2);
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
}