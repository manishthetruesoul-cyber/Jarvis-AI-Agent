/**
 * J.A.R.V.I.S. Arc Reactor Hologram & Background Particle Matrix
 */

class ArcReactorCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.angle1 = 0;
    this.angle2 = 0;
    this.angle3 = 0;
    this.pulse = 0;
    this.pulseSpeed = 0.05;
    this.isProcessing = false;
    this.isSpeaking = false;
    this.shockwaves = [];
    this.particles = [];

    this.initParticles();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 28; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 20 + Math.random() * 60,
        speed: 0.2 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.7
      });
    }
  }

  bindEvents() {
    this.canvas.addEventListener('click', () => {
      this.triggerShockwave();
      if (window.JarvisAudio) {
        window.JarvisAudio.playPulse();
      }
    });
  }

  triggerShockwave() {
    this.shockwaves.push({
      radius: 10,
      maxRadius: 100,
      alpha: 1.0,
      speed: 3.5
    });
  }

  setProcessingState(isProcessing) {
    this.isProcessing = isProcessing;
  }

  setSpeakingState(isSpeaking) {
    this.isSpeaking = isSpeaking;
  }

  animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const baseSpeed = this.isProcessing ? 0.04 : (this.isSpeaking ? 0.03 : 0.012);
    this.angle1 += baseSpeed;
    this.angle2 -= baseSpeed * 1.4;
    this.angle3 += baseSpeed * 0.8;
    this.pulse += this.isProcessing ? 0.12 : (this.isSpeaking ? 0.09 : 0.04);

    const coreGlow = 0.8 + 0.25 * Math.sin(this.pulse);
    const cyan = '#00f0ff';
    const gold = '#ffb703';

    // 1. Draw Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha -= 0.025;
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 240, 255, ${sw.alpha * 0.9})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = cyan;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Floating Energy Particles
    for (let p of this.particles) {
      p.dist += p.speed * (this.isProcessing ? 2 : 1);
      if (p.dist > 85) p.dist = 18;
      const px = this.centerX + Math.cos(p.angle) * p.dist;
      const py = this.centerY + Math.sin(p.angle) * p.dist;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 240, 255, ${p.alpha * (1 - p.dist / 90)})`;
      ctx.shadowColor = cyan;
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    // 3. Outermost Calibration Ring
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle1);

    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 12 Major Radial Ticks
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      const x1 = Math.cos(a) * 88;
      const y1 = Math.sin(a) * 88;
      const x2 = Math.cos(a) * 98;
      const y2 = Math.sin(a) * 98;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = (i % 3 === 0) ? gold : cyan;
      ctx.lineWidth = (i % 3 === 0) ? 2.5 : 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // 4. Secondary Counter-Rotating Ring with Arc Segments
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle2);

    for (let i = 0; i < 6; i++) {
      const start = (i * Math.PI) / 3 + 0.1;
      const end = start + Math.PI / 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, 78, start, end);
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = cyan;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }

    // Secondary dashed circle
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // 5. Central Reactor Core Assembly
    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.angle3);

    // Inner ring
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inverted Triangle
    ctx.beginPath();
    const triR = 40;
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
      const x = Math.cos(a) * triR;
      const y = Math.sin(a) * triR;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = cyan;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Inner Gold Triangle
    ctx.beginPath();
    const triRInner = 24;
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3 + Math.PI / 2;
      const x = Math.cos(a) * triRInner;
      const y = Math.sin(a) * triRInner;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // 6. Central Arc Reactor Glowing Core (Pulsing Palladium Orb)
    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22 * coreGlow);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, 'rgba(0, 240, 255, 0.9)');
    grad.addColorStop(0.7, 'rgba(0, 180, 216, 0.4)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, 22 * coreGlow, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20 * coreGlow;
    ctx.fill();

    // Center pinpoint
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    requestAnimationFrame(this.animate);
  }
}

// Background Starfield / Particle Energy Field
class BackgroundMatrix {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.stars = [];
    this.resize();
    this.initStars();
    window.addEventListener('resize', () => {
      this.resize();
      this.initStars();
    });
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initStars() {
    this.stars = [];
    const count = Math.floor((this.canvas.width * this.canvas.height) / 12000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedY: (Math.random() * 0.3 + 0.1),
        speedX: (Math.random() - 0.5) * 0.1,
        alpha: Math.random() * 0.6 + 0.2,
        glowColor: Math.random() > 0.8 ? '#ffb703' : '#00f0ff'
      });
    }
  }

  animate() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let s of this.stars) {
      s.y -= s.speedY;
      s.x += s.speedX;
      if (s.y < 0) s.y = this.canvas.height;
      if (s.x < 0) s.x = this.canvas.width;
      if (s.x > this.canvas.width) s.x = 0;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = s.glowColor;
      ctx.globalAlpha = s.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    requestAnimationFrame(this.animate);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.JarvisReactor = new ArcReactorCanvas('arcCanvas');
  window.JarvisBg = new BackgroundMatrix('bgCanvas');
});
