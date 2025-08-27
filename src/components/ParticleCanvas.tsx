
import React, { useRef, useEffect } from 'react';

type ParticleShape = 'circle' | 'square' | 'triangle';

interface ParticleCanvasProps {
  analyser: AnalyserNode | null;
  musicSensitivity: number;
  particleShape: ParticleShape;
  text: string;
  isHebrew: boolean;
}

enum AnimationState {
  CHAOS_ASSEMBLY,
  LAST_LETTER_DELAY,
  IMPACT,
  FINAL_ASSEMBLY,
  DONE,
}

const FONT_SIZE = 80;
const FONT = `bold ${FONT_SIZE}px sans-serif`;
const LINE_HEIGHT_MULTIPLIER = 1.2;

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  alpha: number;
  hue: number;
  shape: ParticleShape;
  character: string | null;
  targetX: number;
  targetY: number;
  finalTargetX: number;
  finalTargetY: number;
  isLastLetter: boolean;

  constructor(shape: ParticleShape, character: string | null, targetX: number, targetY: number, canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.character = character;
    this.baseRadius = this.character ? FONT_SIZE / 2 : Math.random() * 2 + 1;
    this.radius = this.baseRadius;
    this.alpha = 0.5;
    this.hue = Math.random() * 360;
    this.shape = shape;
    
    // Final is the correct position
    this.finalTargetX = targetX;
    this.finalTargetY = targetY;

    // Target is the current goal (can be chaotic or final)
    this.targetX = targetX;
    this.targetY = targetY;
    
    this.isLastLetter = false;
  }

  update(
    animationState: AnimationState, 
    spotlight: { x: number, y: number, radius: number },
    canvasWidth: number,
    canvasHeight: number
) {
    if (this.character) {
      if (animationState === AnimationState.LAST_LETTER_DELAY && !this.isLastLetter) {
          // Freeze the jumbled letters
          this.vx = 0;
          this.vy = 0;
      } else {
          // Apply physics to the last letter during delay, and all letters otherwise
          const ax = (this.targetX - this.x) * 0.0007;
          const ay = (this.targetY - this.y) * 0.0007;
          this.vx += ax;
          this.vy += ay;
          
          this.vx *= 0.95; // Damping
          this.vy *= 0.95;
      }
    }

    const dx_spot = spotlight.x - this.x;
    const dy_spot = spotlight.y - this.y;
    const dist_spot = Math.sqrt(dx_spot * dx_spot + dy_spot * dy_spot);
    
    if (dist_spot < spotlight.radius) {
       this.alpha = Math.min(1, 0.5 + (1 - dist_spot / spotlight.radius));
    } else {
      this.alpha = Math.max(0.2, this.alpha - 0.02);
    }

    this.hue += 0.5;
    if (this.hue > 360) this.hue -= 360;

    this.x += this.vx;
    this.y += this.vy;

    // Keep non-text particles on screen
    if (!this.character) {
        if (this.x > canvasWidth + this.radius) this.x = -this.radius;
        if (this.x < -this.radius) this.x = canvasWidth + this.radius;
        if (this.y > canvasHeight + this.radius) this.y = -this.radius;
        if (this.y < -this.radius) this.y = canvasHeight + this.radius;
    }
  }

  draw(context: CanvasRenderingContext2D) {
    const color = `hsl(${this.hue}, 100%, 80%)`;
    context.save();
    context.globalAlpha = this.alpha;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 25;
    
    if (this.character) {
        context.font = FONT;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.character, this.x, this.y);
    } else {
        context.beginPath();
        switch(this.shape) {
            case 'square':
                context.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                break;
            case 'triangle':
                const side = this.radius * 2.5;
                const h = side * (Math.sqrt(3)/2);
                context.moveTo(this.x, this.y - h / 2);
                context.lineTo(this.x - side / 2, this.y + h / 2);
                context.lineTo(this.x + side / 2, this.y + h / 2);
                context.closePath();
                break;
            case 'circle':
            default:
                context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
                break;
        }
        context.fill();
    }
    context.restore();
  }
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ analyser, musicSensitivity, particleShape, text, isHebrew }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationState = useRef<AnimationState>(AnimationState.CHAOS_ASSEMBLY);
  const stateTimer = useRef(0);
  const lastLetterParticle = useRef<Particle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // --- Responsive Configuration ---
    const PARTICLE_DENSITY = 14000;
    const MIN_PARTICLES = 75;
    const MAX_PARTICLES = 350;
    
    let particleCount = 0;
    let connectionDistance = 140;
    // ------------------------------

    let lastBassHitTime = 0;
    const BASS_HIT_COOLDOWN = 200;

    const spotlight = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      tx: Math.random() * window.innerWidth,
      ty: Math.random() * window.innerHeight,
      baseRadius: 200,
      radius: 200,
    };

    let particles: Particle[] = [];
    
    // --- Bidi Text Helpers ---
    const getBidiSegments = (text: string): { text: string, dir: 'ltr' | 'rtl' }[] => {
        if (!text) return [];

        // Regex to split into runs of RTL, LTR, or other (neutral) characters.
        // RTL: Hebrew block. LTR: Latin letters and digits.
        const runs = text.match(/[\u0590-\u05FF]+|[a-zA-Z0-9]+|[^a-zA-Z0-9\u0590-\u05FF]+/g) || [];
        
        const typedRuns = runs.map(run => {
            let dir: 'ltr' | 'rtl' | 'neutral' = 'neutral';
            // Simple check: if the first character is of a certain type, assume the whole run is.
            if (/[\u0590-\u05FF]/.test(run[0])) dir = 'rtl';
            else if (/[a-zA-Z0-9]/.test(run[0])) dir = 'ltr';
            return { text: run, dir };
        });

        const baseDir = isHebrew ? 'rtl' : 'ltr';

        // Resolve neutral runs based on their surrounding strong characters.
        for (let i = 0; i < typedRuns.length; i++) {
            if (typedRuns[i].dir === 'neutral') {
                let prevStrongDir: 'ltr' | 'rtl' | null = null;
                for (let j = i - 1; j >= 0; j--) {
                    const dir = typedRuns[j].dir;
                    if (dir !== 'neutral') {
                        prevStrongDir = dir;
                        break;
                    }
                }

                let nextStrongDir: 'ltr' | 'rtl' | null = null;
                for (let j = i + 1; j < typedRuns.length; j++) {
                    const dir = typedRuns[j].dir;
                    if (dir !== 'neutral') {
                        nextStrongDir = dir;
                        break;
                    }
                }

                if (prevStrongDir && prevStrongDir === nextStrongDir) { // e.g., LTR, neutral, LTR -> all LTR
                    typedRuns[i].dir = prevStrongDir;
                } else if (!prevStrongDir && nextStrongDir) { // Leading neutral: e.g., !!!120
                    typedRuns[i].dir = nextStrongDir;
                } else if (prevStrongDir && !nextStrongDir) { // Trailing neutral: e.g., 120!!!
                    typedRuns[i].dir = prevStrongDir;
                } else { // Mixed context or only neutrals
                    typedRuns[i].dir = baseDir;
                }
            }
        }
        
        // Merge consecutive runs with the same direction
        if (typedRuns.length === 0) return [];

        const merged: { text: string, dir: 'ltr' | 'rtl' }[] = [];
        // Ensure the first run has a strong direction
        if (typedRuns[0].dir === 'neutral') typedRuns[0].dir = baseDir;
        let currentRun = { ...typedRuns[0] } as { text: string, dir: 'ltr' | 'rtl' };
        
        for (let i = 1; i < typedRuns.length; i++) {
            const nextRun = typedRuns[i];
            // If next run is neutral, it should have been resolved. If not, fallback to baseDir.
            const nextDir = nextRun.dir === 'neutral' ? baseDir : nextRun.dir;

            if (nextDir === currentRun.dir) {
                currentRun.text += nextRun.text;
            } else {
                merged.push(currentRun);
                currentRun = { text: nextRun.text, dir: nextDir };
            }
        }
        merged.push(currentRun);

        return merged;
    };


    const initParticles = () => {
        particles = [];
        const lines = text.split('|').filter(line => line.length > 0);
        if (lines.length === 0) return;

        ctx.font = FONT;

        const totalLineHeight = FONT_SIZE * LINE_HEIGHT_MULTIPLIER;
        const totalTextBlockHeight = lines.length * totalLineHeight - (totalLineHeight - FONT_SIZE);
        let yOffset = (canvas.height - totalTextBlockHeight) / 2 + FONT_SIZE / 2;
        
        const characterParticles: Particle[] = [];
        
        for (const line of lines) {
            if (isHebrew) {
                const segments = getBidiSegments(line);
                const segmentMetrics = segments.map(seg => ({ ...seg, width: ctx.measureText(seg.text).width }));
                const totalLineWidth = segmentMetrics.reduce((sum, seg) => sum + seg.width, 0);

                let currentLineX = (canvas.width + totalLineWidth) / 2;

                for (const segment of segmentMetrics) {
                    if (segment.dir === 'rtl') {
                        let currentSegmentXOffset = 0;
                        for (const char of segment.text) {
                            const charMetrics = ctx.measureText(char);
                            if (char !== ' ') {
                                const targetX = currentLineX - currentSegmentXOffset - charMetrics.width / 2;
                                const p = new Particle(particleShape, char, targetX, yOffset, canvas.width, canvas.height);
                                characterParticles.push(p);
                            }
                            currentSegmentXOffset += charMetrics.width;
                        }
                    } else { // LTR segment
                        const segmentStartX = currentLineX - segment.width;
                        let currentSegmentXOffset = 0;
                        for (const char of segment.text) {
                            const charMetrics = ctx.measureText(char);
                            if (char !== ' ') {
                                const targetX = segmentStartX + currentSegmentXOffset + charMetrics.width / 2;
                                const p = new Particle(particleShape, char, targetX, yOffset, canvas.width, canvas.height);
                                characterParticles.push(p);
                            }
                            currentSegmentXOffset += charMetrics.width;
                        }
                    }
                    currentLineX -= segment.width;
                }
            } else { // Standard LTR logic
                const textMetrics = ctx.measureText(line);
                const textWidth = textMetrics.width;
                const startX = (canvas.width - textWidth) / 2;
                let currentX = 0;
                
                for (const char of line) {
                    const charMetrics = ctx.measureText(char);
                    if (char !== ' ') {
                        const targetX = startX + currentX + charMetrics.width / 2;
                        const p = new Particle(particleShape, char, targetX, yOffset, canvas.width, canvas.height);
                        characterParticles.push(p);
                    }
                    currentX += charMetrics.width;
                }
            }
            yOffset += totalLineHeight;
        }

        // --- Start Humorous Animation Setup ---
        animationState.current = AnimationState.CHAOS_ASSEMBLY;
        stateTimer.current = 0;
        lastLetterParticle.current = null;
        
        if (characterParticles.length > 0) {
            // For RTL text, the "first" character (visually rightmost) flies in.
            // For LTR, the "last" character (visually rightmost) flies in.
            // The goal is to have the character at the start of the reading flow be the special one.
            const specialParticleIndex = isHebrew ? 0 : characterParticles.length - 1;
            const specialParticle = characterParticles[specialParticleIndex];
            specialParticle.isLastLetter = true; // Re-purposing this flag to mean "is the special particle"
            specialParticle.x = -100; // Start off-screen
            specialParticle.y = canvas.height / 2;
            lastLetterParticle.current = specialParticle;

            // Get all other particles for shuffling
            const otherParticles = characterParticles.filter((_, index) => index !== specialParticleIndex);
            const targetPositions = otherParticles.map(p => ({ x: p.finalTargetX, y: p.finalTargetY }));
            
            // Shuffle target positions (Fisher-Yates shuffle)
            for (let i = targetPositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [targetPositions[i], targetPositions[j]] = [targetPositions[j], targetPositions[i]];
            }
            
            // Assign shuffled targets
            otherParticles.forEach((p, i) => {
                p.targetX = targetPositions[i].x;
                p.targetY = targetPositions[i].y;
            });
        }
        
        particles.push(...characterParticles);
        
        const totalCharacters = characterParticles.length;
        const remainingParticles = Math.max(0, particleCount - totalCharacters);
        for (let i = 0; i < remainingParticles; i++) {
            particles.push(new Particle(particleShape, null, 0, 0, canvas.width, canvas.height));
        }
    };
    
    const connect = (context: CanvasRenderingContext2D, threshold: number) => {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                const dx = particles[a].x - particles[b].x;
                const dy = particles[a].y - particles[b].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < threshold) {
                    const opacity = 1 - (distance / threshold);
                    const lineAlpha = Math.min(particles[a].alpha, particles[b].alpha) * 0.9;
                    const gradient = context.createLinearGradient(particles[a].x, particles[a].y, particles[b].x, particles[b].y);
                    gradient.addColorStop(0, `hsla(${particles[a].hue}, 100%, 80%, ${opacity * lineAlpha})`);
                    gradient.addColorStop(1, `hsla(${particles[b].hue}, 100%, 80%, ${opacity * lineAlpha})`);
                    context.strokeStyle = gradient;
                    context.lineWidth = 1;
                    context.beginPath();
                    context.moveTo(particles[a].x, particles[a].y);
                    context.lineTo(particles[b].x, particles[b].y);
                    context.stroke();
                }
            }
        }
    };
    
    const updateCanvasConfig = () => {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particleCount = Math.max( MIN_PARTICLES, Math.min( MAX_PARTICLES, Math.floor((canvas.width * canvas.height) / PARTICLE_DENSITY)));
        connectionDistance = Math.max(100, Math.min(170, canvas.width / 12));
    };

    const handleResize = () => {
        if (!canvas) return;
        updateCanvasConfig();
        spotlight.x = canvas.width / 2;
        spotlight.y = canvas.height / 2;
        spotlight.tx = Math.random() * canvas.width;
        spotlight.ty = Math.random() * canvas.height;
        initParticles();
    };

    window.addEventListener('resize', handleResize);
    updateCanvasConfig();
    initParticles();
    
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      // --- Animation State Machine ---
      switch (animationState.current) {
        case AnimationState.CHAOS_ASSEMBLY:
          let allInPlace = true;
          particles.forEach(p => {
            if (p.character && !p.isLastLetter) {
              const dist = Math.hypot(p.x - p.targetX, p.y - p.targetY);
              if (dist > 10) allInPlace = false;
            }
          });
          if (allInPlace && lastLetterParticle.current) {
            animationState.current = AnimationState.LAST_LETTER_DELAY;
            stateTimer.current = 660; // 11 seconds at 60fps
          }
          break;

        case AnimationState.LAST_LETTER_DELAY:
          stateTimer.current--;
          if (lastLetterParticle.current) {
             const lp = lastLetterParticle.current;
             const initialDelay = 660;
             
             // Calculate center of the jumbled phrase
             let centerX = 0;
             let centerY = 0;
             let count = 0;
             particles.forEach(p => {
                 if (p.character && !p.isLastLetter) {
                     centerX += p.x;
                     centerY += p.y;
                     count++;
                 }
             });
             
             if (count > 0) {
                 centerX /= count;
                 centerY /= count;
             } else { // Fallback if no other letters
                 centerX = canvas.width / 2;
                 centerY = canvas.height / 2;
             }
             
             const angle = (initialDelay - stateTimer.current) * 0.035; // Speed of circle
             const radius = 250; // Radius of circle
             lp.targetX = centerX + Math.cos(angle) * radius;
             lp.targetY = centerY + Math.sin(angle) * radius;
          }
          if (stateTimer.current <= 0) {
            animationState.current = AnimationState.IMPACT;
          }
          break;

        case AnimationState.IMPACT:
            const lp = lastLetterParticle.current;
            if (lp) {
                particles.forEach(p => {
                    if (p.character && !p.isLastLetter) {
                        const dx = p.x - lp.x;
                        const dy = p.y - lp.y;
                        const dist = Math.max(1, Math.hypot(dx, dy));
                        const force = 300 / dist; // MUCH stronger push
                        p.vx += (dx / dist) * force;
                        p.vy += (dy / dist) * force;
                    }
                    // Set correct final target for ALL particles
                    p.targetX = p.finalTargetX;
                    p.targetY = p.finalTargetY;
                });
            }
            animationState.current = AnimationState.FINAL_ASSEMBLY;
            break;
        
        case AnimationState.FINAL_ASSEMBLY:
          let allFinallyInPlace = true;
          particles.forEach(p => {
            if (p.character) {
              const dist = Math.hypot(p.x - p.targetX, p.y - p.targetY);
              if (dist > 1) allFinallyInPlace = false;
            }
          });
          if (allFinallyInPlace) {
            animationState.current = AnimationState.DONE;
          }
          break;
        
        case AnimationState.DONE:
          // Particles now just chill at their final spot
          break;
      }
      
      let audioValue = 0;
      if (analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        const bassFrequencies = dataArray.slice(0, Math.floor(bufferLength / 4));
        audioValue = bassFrequencies.reduce((sum, value) => sum + value, 0) / bassFrequencies.length || 0;
      }

      spotlight.x += (spotlight.tx - spotlight.x) * 0.04;
      spotlight.y += (spotlight.ty - spotlight.y) * 0.04;
      const distToTarget = Math.hypot(spotlight.tx - spotlight.x, spotlight.ty - spotlight.y);
      const now = Date.now();
      const isBassHit = (audioValue * musicSensitivity > 150) && (now - lastBassHitTime > BASS_HIT_COOLDOWN);
      if (isBassHit || distToTarget < 10) {
          spotlight.tx = Math.random() * canvas.width;
          spotlight.ty = Math.random() * canvas.height;
          if (isBassHit) lastBassHitTime = now;
      }
      const normalizedBass = Math.min(audioValue / 200, 1.0);
      const targetRadius = spotlight.baseRadius + normalizedBass * musicSensitivity * 150;
      spotlight.radius += (targetRadius - spotlight.radius) * 0.1;
      
      particles.forEach(p => {
        p.update(animationState.current, spotlight, canvas.width, canvas.height);
        p.draw(ctx);
      });
      
      connect(ctx, connectionDistance);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [analyser, musicSensitivity, particleShape, text, isHebrew]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full bg-transparent" />;
};

export default ParticleCanvas;