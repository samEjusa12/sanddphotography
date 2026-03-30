document.addEventListener('DOMContentLoaded', function () {
  const circularNav = document.querySelector('[data-circular-nav]');
  if (!circularNav) {
    return;
  }

  const ring = circularNav.querySelector('[data-ring]');
  const items = Array.from(ring.querySelectorAll('.circular-nav-item'));
  const controls = Array.from(circularNav.querySelectorAll('[data-rotate]'));
  const focusLabel = circularNav.querySelector('[data-focus-label] .circular-nav-focus-name');

  const state = {
    rotation: 0,
    velocity: 0,
    isDragging: false,
    lastX: 0,
    frame: null
  };

  const itemCount = items.length;
  const step = 360 / itemCount;

  function getOrbitMetrics() {
    if (window.innerWidth <= 600) {
      return { radiusX: 120, radiusY: 98, depth: 84 };
    }
    if (window.innerWidth <= 900) {
      return { radiusX: 156, radiusY: 122, depth: 108 };
    }
    return { radiusX: 196, radiusY: 150, depth: 136 };
  }

  function normalizeAngle(angle) {
    let normalized = angle % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    return normalized;
  }

  function updateFrontItem() {
    let closestItem = null;
    let closestDepth = -Infinity;

    items.forEach(function (item, index) {
      const itemAngle = (index * step + state.rotation) * (Math.PI / 180);
      const depth = Math.cos(itemAngle);

      item.classList.remove('is-front');

      if (depth > closestDepth) {
        closestDepth = depth;
        closestItem = item;
      }
    });

    if (closestItem) {
      closestItem.classList.add('is-front');
      if (focusLabel) {
        focusLabel.textContent = closestItem.dataset.label || closestItem.textContent || '';
      }
    }
  }

  function render() {
    const metrics = getOrbitMetrics();

    items.forEach(function (item, index) {
      const angle = (index * step + state.rotation) * (Math.PI / 180);
      const x = Math.sin(angle) * metrics.radiusX;
      const y = Math.sin(angle * 2) * metrics.radiusY * 0.5;
      const z = Math.cos(angle) * metrics.depth;
      const depthRatio = (z + metrics.depth) / (2 * metrics.depth);
      const scale = 0.68 + depthRatio * 0.72;
      const opacity = 0.38 + depthRatio * 0.62;
      const brightness = 0.72 + depthRatio * 0.42;

      item.style.transform = 'translate(-50%, -50%) translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, ' + z.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
      item.style.opacity = opacity.toFixed(3);
      item.style.filter = 'brightness(' + brightness.toFixed(3) + ')';
      item.style.zIndex = String(1000 + Math.round(z));
    });

    updateFrontItem();
  }

  function animateInertia() {
    if (state.isDragging) {
      state.frame = null;
      return;
    }

    state.velocity *= 0.94;

    if (Math.abs(state.velocity) < 0.02) {
      state.velocity = 0;
      state.frame = null;
      render();
      return;
    }

    state.rotation += state.velocity;
    render();
    state.frame = requestAnimationFrame(animateInertia);
  }

  function startInertia() {
    if (state.frame) {
      cancelAnimationFrame(state.frame);
    }
    state.frame = requestAnimationFrame(animateInertia);
  }

  function rotateBy(amount) {
    state.rotation += amount;
    render();
    startInertia();
  }

  function onPointerDown(event) {
    state.isDragging = true;
    state.lastX = event.clientX;
    state.velocity = 0;
    ring.classList.add('is-dragging');

    if (state.frame) {
      cancelAnimationFrame(state.frame);
      state.frame = null;
    }

    ring.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!state.isDragging) {
      return;
    }

    const deltaX = event.clientX - state.lastX;
    state.lastX = event.clientX;
    state.rotation += deltaX * 0.35;
    state.velocity = deltaX * 0.12;
    render();
  }

  function onPointerUp(event) {
    if (!state.isDragging) {
      return;
    }

    state.isDragging = false;
    ring.classList.remove('is-dragging');

    try {
      ring.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Ignore pointer capture release issues.
    }

    startInertia();
  }

  ring.addEventListener('pointerdown', onPointerDown);
  ring.addEventListener('pointermove', onPointerMove);
  ring.addEventListener('pointerup', onPointerUp);
  ring.addEventListener('pointercancel', onPointerUp);
  ring.addEventListener('lostpointercapture', onPointerUp);

  circularNav.addEventListener('wheel', function (event) {
    event.preventDefault();
    state.velocity += event.deltaY * -0.0022;
    state.rotation += event.deltaY * -0.08;
    render();
    startInertia();
  }, { passive: false });

  controls.forEach(function (button) {
    button.addEventListener('click', function () {
      const direction = Number(button.getAttribute('data-rotate')) || 0;
      state.velocity = direction * 1.8;
      rotateBy(direction * step);
    });
  });

  items.forEach(function (item) {
    item.addEventListener('click', function (event) {
      const href = item.getAttribute('href') || '';
      const isSamePageHash = href.startsWith('index.html#') || href.startsWith('#');

      if (isSamePageHash) {
        const hash = href.includes('#') ? href.slice(href.indexOf('#')) : href;
        const target = document.querySelector(hash);

        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  window.addEventListener('resize', render);

  render();
});