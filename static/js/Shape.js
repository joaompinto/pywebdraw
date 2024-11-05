export class Shape {
    constructor(type, props) {
        this.type = type;
        this.color = props.color || '#e74c3c';
        this.rotation = props.rotation || 0;

        if (type === 'circle') {
            this.x = props.x;
            this.y = props.y;
            this.size = props.size;
        } else {
            // All other shapes use absolute coordinates
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

        switch(this.type) {
            case 'rectangle': {
                const width = this.x2 - this.x1;
                const height = this.y2 - this.y1;
                ctx.fillRect(this.x1, this.y1, width, height);
                break;
            }
            case 'circle':
                ctx.beginPath();
                ctx.arc(this.x + this.size, this.y + this.size, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'triangle': {
                const width = this.x2 - this.x1;
                const height = this.y2 - this.y1;
                ctx.beginPath();
                ctx.moveTo(this.x1 + width/2, this.y1);
                ctx.lineTo(this.x1, this.y2);
                ctx.lineTo(this.x2, this.y2);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'line':
                ctx.beginPath();
                ctx.moveTo(this.x1, this.y1);
                ctx.lineTo(this.x2, this.y2);
                ctx.stroke();
                break;
        }
        ctx.restore();
    }
}