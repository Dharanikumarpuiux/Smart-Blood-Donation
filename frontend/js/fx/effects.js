/**
 * ============================================================
 * LIFEDROP VISUAL EFFECTS LAYER (Antigravity FX Engine)
 * Isolated presentation-layer module for modern, dynamic effects
 * ============================================================
 */

(function () {
  'use strict';

  // ── Kill Switch & URL/Storage Configuration ──
  const queryParams = new URLSearchParams(window.location.search);
  const fxQuery = queryParams.get('fx');
  let isFxEnabled = true;

  if (fxQuery !== null) {
    isFxEnabled = fxQuery !== '0' && fxQuery !== 'false';
    try { localStorage.setItem('ENABLE_FX', isFxEnabled ? 'true' : 'false'); } catch (e) {}
  } else {
    try {
      const stored = localStorage.getItem('ENABLE_FX');
      if (stored !== null) isFxEnabled = stored !== 'false';
    } catch (e) {}
  }

  // Allow runtime override
  if (typeof window.ENABLE_FX !== 'undefined') {
    isFxEnabled = !!window.ENABLE_FX;
  }
  window.ENABLE_FX = isFxEnabled;

  const FX = {
    enabled: isFxEnabled,
    cleanupHandlers: [],

    // Public toggle / control methods
    enable() {
      try { localStorage.setItem('ENABLE_FX', 'true'); } catch (e) {}
      window.ENABLE_FX = true;
      FX.enabled = true;
      FX.init();
      console.log('✨ LifeDrop FX Layer: Enabled');
    },

    disable() {
      try { localStorage.setItem('ENABLE_FX', 'false'); } catch (e) {}
      window.ENABLE_FX = false;
      FX.enabled = false;
      FX.cleanup();
      console.log('🛑 LifeDrop FX Layer: Disabled (Kill Switch Active)');
    },

    toggle() {
      if (FX.enabled) FX.disable();
      else FX.enable();
    },

    getStatus() {
      return {
        enabled: FX.enabled,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        finePointer: window.matchMedia('(pointer: fine)').matches,
        gsapLoaded: typeof window.gsap !== 'undefined',
      };
    },

    init() {
      if (!FX.enabled) {
        console.log('🛑 LifeDrop FX Layer: Kill Switch is OFF (No effects mounted)');
        return;
      }

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isTouch = window.matchMedia('(pointer: coarse)').matches;

      // Mount all effect subsystems
      FX.initElectricFilterDefs();
      FX.initElectricBorders();
      FX.initLiquidNav();
      if (!isTouch) FX.initCardSpotlight();
      if (!isTouch && !prefersReducedMotion) FX.initTubeCursor();
      FX.initScrollReveal();
      if (!prefersReducedMotion) FX.initHeroIdleState();

      // Listen for reduced-motion changes dynamically
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMotionChange = (e) => {
        if (e.matches) FX.disableMotionHeavy();
        else FX.enableMotionHeavy();
      };
      motionQuery.addEventListener('change', handleMotionChange);
      FX.cleanupHandlers.push(() => motionQuery.removeEventListener('change', handleMotionChange));
    },

    cleanup() {
      // Execute all cleanup callbacks
      while (FX.cleanupHandlers.length) {
        try { FX.cleanupHandlers.pop()(); } catch (e) {}
      }

      // Remove created elements
      const elementsToRemove = [
        document.getElementById('fx-tube-canvas'),
        document.getElementById('fx-svg-defs'),
        document.querySelector('.fx-liquid-indicator'),
      ];
      elementsToRemove.forEach(el => {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });

      // Remove effect classes
      document.querySelectorAll('.electric-border-card').forEach(el => {
        el.classList.remove('electric-border-card', 'theme-gold');
        const decor = el.querySelectorAll('.electric-border-svg, .electric-border-glow-1, .electric-border-glow-2, .electric-border-inner');
        decor.forEach(d => d.remove());
      });
      document.querySelectorAll('.fx-spotlight').forEach(el => el.classList.remove('fx-spotlight'));
      document.querySelectorAll('.fx-reveal').forEach(el => el.classList.remove('fx-reveal', 'fx-revealed'));
      document.querySelectorAll('.fx-idle-pulse').forEach(el => el.classList.remove('fx-idle-pulse'));
      document.querySelectorAll('.fx-idle-glow').forEach(el => el.classList.remove('fx-idle-glow'));
    },

    disableMotionHeavy() {
      const canvas = document.getElementById('fx-tube-canvas');
      if (canvas) canvas.style.display = 'none';
      document.querySelectorAll('.fx-idle-pulse').forEach(el => el.classList.remove('fx-idle-pulse'));
      document.querySelectorAll('.fx-idle-glow').forEach(el => el.classList.remove('fx-idle-glow'));
    },

    enableMotionHeavy() {
      const canvas = document.getElementById('fx-tube-canvas');
      if (canvas) canvas.style.display = 'block';
    },

    /* ============================================================
       1. EFFECT A: ELECTRIC BORDER
       ============================================================ */
    initElectricFilterDefs() {
      if (document.getElementById('fx-svg-defs')) return;

      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      svg.id = 'fx-svg-defs';
      svg.setAttribute('style', 'position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;');
      svg.setAttribute('aria-hidden', 'true');

      svg.innerHTML = `
        <defs>
          <filter id="electric-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04 0.95" numOctaves="3" seed="1">
              <animate attributeName="seed" from="1" to="100" dur="2.4s" repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <filter id="electric-filter-gold" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05 0.90" numOctaves="3" seed="5">
              <animate attributeName="seed" from="5" to="105" dur="2.4s" repeatCount="indefinite"/>
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      `;
      document.body.appendChild(svg);
    },

    wrapElectric(element, theme = 'primary') {
      if (!element || element.dataset.electricInit) return;
      element.dataset.electricInit = '1';
      element.classList.add('electric-border-card');
      if (theme === 'gold') element.classList.add('theme-gold');

      // Create inner/outer glow and SVG distortion line
      const glow2 = document.createElement('div');
      glow2.className = 'electric-border-glow-2';
      glow2.setAttribute('aria-hidden', 'true');

      const glow1 = document.createElement('div');
      glow1.className = 'electric-border-glow-1';
      glow1.setAttribute('aria-hidden', 'true');

      const inner = document.createElement('div');
      inner.className = 'electric-border-inner';
      inner.setAttribute('aria-hidden', 'true');

      const svgNs = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNs, 'svg');
      svg.className.baseVal = 'electric-border-svg';
      svg.setAttribute('aria-hidden', 'true');

      const rect = document.createElementNS(svgNs, 'rect');
      rect.className.baseVal = 'electric-border-rect';
      rect.setAttribute('x', '2');
      rect.setAttribute('y', '2');
      rect.setAttribute('width', 'calc(100% - 4px)');
      rect.setAttribute('height', 'calc(100% - 4px)');
      rect.setAttribute('rx', '20');
      rect.setAttribute('ry', '20');

      svg.appendChild(rect);
      element.prepend(glow2, glow1, inner, svg);
    },

    initElectricBorders() {
      // Highlight urgent request cards, top featured match cards, and hero main card
      const targetSelectors = [
        '.hero-main-card',
        '.request-card.urgency-critical',
        '.urgent-alert',
        '.stat-card.featured',
      ];

      targetSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => FX.wrapElectric(el, el.classList.contains('featured') ? 'gold' : 'primary'));
      });

      // Observe dynamic insertions into search/donors/requests grids
      const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('.request-card.urgency-critical, .urgent-alert')) {
              FX.wrapElectric(node, 'primary');
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('.request-card.urgency-critical, .urgent-alert').forEach(el => FX.wrapElectric(el, 'primary'));
            }
          });
        });
      });

      const container = document.body;
      observer.observe(container, { childList: true, subtree: true });
      FX.cleanupHandlers.push(() => observer.disconnect());
    },

    /* ============================================================
       2. EFFECT B: LIQUID NAVBAR INDICATOR
       ============================================================ */
    initLiquidNav() {
      const navLinksContainer = document.getElementById('nav-links') || document.querySelector('.nav-links');
      if (!navLinksContainer) return;

      // Only create indicator once
      let indicator = navLinksContainer.querySelector('.fx-liquid-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'fx-liquid-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        navLinksContainer.appendChild(indicator);
      }

      const links = Array.from(navLinksContainer.querySelectorAll('a')).filter(a => {
        const li = a.closest('li') || a;
        return li.style.display !== 'none';
      });
      if (links.length === 0) return;

      // Determine active link: exact href matching or class 'active'
      const getActiveLink = () => {
        const activeByClass = links.find(a => a.classList.contains('active'));
        if (activeByClass) return activeByClass;

        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        const activeByPath = links.find(a => {
          const href = a.getAttribute('href');
          return href && (href === currentPath || (currentPath === '' && href === 'index.html'));
        });
        return activeByPath || links[0];
      };

      const moveTo = (targetEl, immediate = false) => {
        if (!targetEl || window.innerWidth <= 768) {
          if (indicator) indicator.style.opacity = '0';
          return;
        }

        const navRect = navLinksContainer.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const x = targetRect.left - navRect.left;
        const y = targetRect.top - navRect.top;
        const width = targetRect.width;
        const height = targetRect.height;

        if (typeof window.gsap !== 'undefined') {
          if (immediate) {
            window.gsap.set(indicator, { x, y, width, height, opacity: 1 });
          } else {
            window.gsap.to(indicator, {
              x,
              y,
              width,
              height,
              opacity: 1,
              duration: 0.35,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }
        } else {
          indicator.style.transform = `translate(${x}px, ${y}px)`;
          indicator.style.width = `${width}px`;
          indicator.style.height = `${height}px`;
          indicator.style.opacity = '1';
          indicator.style.transition = immediate ? 'none' : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.35s ease, opacity 0.3s ease';
        }
      };

      const handleMouseEnter = (e) => moveTo(e.currentTarget, false);
      const handleMouseLeave = () => {
        const active = getActiveLink();
        if (active) moveTo(active, false);
      };

      links.forEach(a => {
        a.addEventListener('mouseenter', handleMouseEnter);
      });
      navLinksContainer.addEventListener('mouseleave', handleMouseLeave);

      // Debounced resize handler
      let resizeTimer = null;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const active = getActiveLink();
          if (active) moveTo(active, true);
        }, 100);
      };
      window.addEventListener('resize', handleResize);

      // Wait for webfonts ready before initial positioning
      const initialPosition = () => {
        const active = getActiveLink();
        if (active) {
          moveTo(active, true);
          // Smooth fade in on first paint
          if (typeof window.gsap !== 'undefined') {
            window.gsap.fromTo(indicator, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.05 });
          }
        }
      };

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(initialPosition);
      } else {
        setTimeout(initialPosition, 150);
      }

      FX.cleanupHandlers.push(() => {
        links.forEach(a => a.removeEventListener('mouseenter', handleMouseEnter));
        navLinksContainer.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('resize', handleResize);
        if (typeof window.gsap !== 'undefined') window.gsap.killTweensOf(indicator);
      });
    },

    /* ============================================================
       3. EFFECT C: CARD SPOTLIGHT / CURSOR-TRACKING GLOW
       ============================================================ */
    initCardSpotlight() {
      const spotlightSelectors = [
        '.card',
        '.donor-card',
        '.request-card',
        '.stat-card',
        '.cta-card',
        '.how-step',
        '.blood-unit-card',
      ];

      const attachSpotlight = (el) => {
        if (!el || el.dataset.spotlightInit) return;
        el.dataset.spotlightInit = '1';
        el.classList.add('fx-spotlight');

        const onPointerMove = (e) => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          el.style.setProperty('--spotlight-x', `${x}px`);
          el.style.setProperty('--spotlight-y', `${y}px`);
        };

        el.addEventListener('pointermove', onPointerMove, { passive: true });
        el.addEventListener('mousemove', onPointerMove, { passive: true });
        FX.cleanupHandlers.push(() => {
          el.removeEventListener('pointermove', onPointerMove);
          el.removeEventListener('mousemove', onPointerMove);
        });
      };

      spotlightSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(attachSpotlight);
      });

      // Observe newly added cards
      const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            spotlightSelectors.forEach(sel => {
              if (node.matches && node.matches(sel)) attachSpotlight(node);
              if (node.querySelectorAll) node.querySelectorAll(sel).forEach(attachSpotlight);
            });
          });
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
      FX.cleanupHandlers.push(() => observer.disconnect());
    },

    /* ============================================================
       4. EFFECT D: FULL-VIEWPORT GLOWING TUBE CURSOR
       ============================================================ */
    initTubeCursor() {
      // Create canvas overlay
      let canvas = document.getElementById('fx-tube-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'fx-tube-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let dpr = window.devicePixelRatio || 1;
      let width = window.innerWidth;
      let height = window.innerHeight;

      const resizeCanvas = () => {
        dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      };
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      // Shorter, sleeker trail (18 points max, ~300ms lifetime)
      const points = [];
      const MAX_POINTS = 18;
      let mouseX = -200;
      let mouseY = -200;
      let targetX = -200;
      let targetY = -200;
      let ringX = -200;
      let ringY = -200;
      let isVisible = false;
      let lastMoveTime = performance.now();
      let animFrameId = null;

      const onPointerMove = (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        mouseX = e.clientX;
        mouseY = e.clientY;
        isVisible = true;
        const now = performance.now();
        lastMoveTime = now;

        points.unshift({ x: mouseX, y: mouseY, time: now });
        if (points.length > MAX_POINTS) points.pop();
      };

      const onPointerLeave = () => {
        isVisible = false;
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('mousemove', onPointerMove, { passive: true });
      document.addEventListener('mouseleave', onPointerLeave);

      // Catmull-Rom spline / quadratic curve & resting circle loop
      const render = () => {
        const now = performance.now();

        // Clear canvas cleanly
        ctx.clearRect(0, 0, width, height);

        // Smoothly interpolate resting ring position towards cursor
        const lerpFactor = 0.28;
        ringX += (targetX - ringX) * lerpFactor;
        ringY += (targetY - ringY) * lerpFactor;

        // Filter out stale trail points (> 320ms for shorter, crisp tail)
        while (points.length > 0 && now - points[points.length - 1].time > 320) {
          points.pop();
        }

        // 1. Draw Short Multi-Color Comet Trail
        if (points.length > 2) {
          // Dynamic chromatic gradient: Electric Ruby -> Neon Coral -> Radiant Gold -> Cyan Accent
          const grad = ctx.createLinearGradient(
            points[0].x, points[0].y,
            points[points.length - 1].x, points[points.length - 1].y
          );
          grad.addColorStop(0, '#ff2a5f');     // Vibrant Electric Ruby
          grad.addColorStop(0.35, '#ff7544');  // Radiant Coral/Orange
          grad.addColorStop(0.7, '#ffd043');   // Luminous Gold
          grad.addColorStop(1, 'rgba(0, 229, 255, 0)'); // Cyan Fadeout

          // Outer Neon Glow Layer
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = grad;
          ctx.lineWidth = 8;
          ctx.shadowColor = '#ff3366';
          ctx.shadowBlur = 12;
          ctx.globalAlpha = 0.55;
          ctx.stroke();
          ctx.restore();

          // Crisp Inner White/Cyan Core
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 5;
          ctx.globalAlpha = 0.9;
          ctx.stroke();
          ctx.restore();
        }

        // 2. Draw Distinct Resting Pointer Circle Effect
        if (isVisible && ringX > 0 && ringY > 0) {
          const timeSec = now * 0.003;
          const isAtRest = (now - lastMoveTime > 120);

          // Subtle breathing radius and opacity oscillation
          const pulse = Math.sin(timeSec);
          const baseRadius = isAtRest ? 14 + pulse * 2.5 : 10;
          const auraRadius = baseRadius + 6 + pulse * 2;

          // Outer Cyan / Electric Gold Aura Ring
          ctx.save();
          ctx.beginPath();
          ctx.arc(ringX, ringY, auraRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)'; // Electric Cyan
          ctx.lineWidth = 1.2;
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = isAtRest ? 10 : 4;
          ctx.stroke();
          ctx.restore();

          // Main Vibrant Ring (Vivid Amber Gold / Emerald-Cyan duo)
          ctx.save();
          ctx.beginPath();
          ctx.arc(ringX, ringY, baseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = isAtRest ? '#ffd043' : 'rgba(255, 107, 107, 0.85)';
          ctx.lineWidth = 2;
          ctx.shadowColor = isAtRest ? '#ffd043' : '#ff3366';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.restore();

          // Center Glowing Pin Dot
          ctx.save();
          ctx.beginPath();
          ctx.arc(ringX, ringY, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.restore();
        }

        animFrameId = requestAnimationFrame(render);
      };

      render();

      FX.cleanupHandlers.push(() => {
        window.removeEventListener('resize', resizeCanvas);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('mouseleave', onPointerLeave);
        if (animFrameId) cancelAnimationFrame(animFrameId);
      });
    },

    /* ============================================================
       5. EFFECT E: SCROLL REVEAL
       ============================================================ */
    initScrollReveal() {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const revealSelectors = [
        'section',
        '.stats-row',
        '.stat-card',
        '.cta-cards',
        '.cta-card',
        '.how-steps',
        '.how-step',
        '.blood-types-grid',
        '.bt-card',
        '.donor-card',
        '.request-card',
      ];

      const elementsToReveal = document.querySelectorAll(revealSelectors.join(', '));
      elementsToReveal.forEach(el => {
        if (!el.classList.contains('fx-reveal')) el.classList.add('fx-reveal');
      });

      if (prefersReducedMotion) {
        elementsToReveal.forEach(el => el.classList.add('fx-revealed'));
        return;
      }

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fx-revealed');
            obs.unobserve(entry.target);
          }
        });
      }, {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.1,
      });

      elementsToReveal.forEach(el => observer.observe(el));

      // Observe dynamically added cards
      const mutObserver = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('.donor-card, .request-card')) {
              node.classList.add('fx-reveal');
              observer.observe(node);
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('.donor-card, .request-card').forEach(c => {
                c.classList.add('fx-reveal');
                observer.observe(c);
              });
            }
          });
        });
      });

      mutObserver.observe(document.body, { childList: true, subtree: true });

      FX.cleanupHandlers.push(() => {
        observer.disconnect();
        mutObserver.disconnect();
      });
    },

    /* ============================================================
       6. EFFECT F: HERO REST / IDLE STATE ANIMATION
       ============================================================ */
    initHeroIdleState() {
      // Landing page only: check if we are on index / hero
      const heroCta = document.querySelector('.hero-btns .btn-primary');
      const heroDropIcon = document.querySelector('.hero-main-card .drop-icon');
      if (!heroCta && !heroDropIcon) return;

      const IDLE_TIMEOUT_MS = 8000; // 8 seconds of inactivity
      let idleTimer = null;
      let isIdle = false;

      const startIdle = () => {
        isIdle = true;
        if (heroCta) heroCta.classList.add('fx-idle-pulse');
        if (heroDropIcon) heroDropIcon.classList.add('fx-idle-glow');
      };

      const stopIdle = () => {
        if (isIdle) {
          isIdle = false;
          if (heroCta) heroCta.classList.remove('fx-idle-pulse');
          if (heroDropIcon) heroDropIcon.classList.remove('fx-idle-glow');
        }
        resetIdleTimer();
      };

      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(startIdle, IDLE_TIMEOUT_MS);
      };

      const interactionEvents = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'];
      interactionEvents.forEach(evt => {
        window.addEventListener(evt, stopIdle, { passive: true });
      });

      resetIdleTimer();

      FX.cleanupHandlers.push(() => {
        clearTimeout(idleTimer);
        interactionEvents.forEach(evt => window.removeEventListener(evt, stopIdle));
        if (heroCta) heroCta.classList.remove('fx-idle-pulse');
        if (heroDropIcon) heroDropIcon.classList.remove('fx-idle-glow');
      });
    },
  };

  // Expose FX to window
  window.FX = FX;

  // Auto-boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => FX.init());
  } else {
    FX.init();
  }
})();
