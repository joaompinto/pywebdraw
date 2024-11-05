export class Shape {
    constructor(type, props) {
        this.type = type;
        this.color = props.color || '#e74c3c';
        delete props.color;
        Object.assign(this, props);
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        
        switch(this.type) {
            case 'rectangle':
                ctx.beginPath();
                ctx.rect(this.x, this.y, this.width, this.height);
                ctx.fill();
                ctx.stroke();
                break;
            case 'circle':
                ctx.beginPath();
                ctx.arc(this.x + this.size, this.y + this.size, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.width, this.y);
                ctx.lineTo(this.x + this.width / 2, this.y + this.height);
                ctx.closePath();
                ctx.fill();
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
}