// Game loop with fixed-step simulation and speed multiplier (pause = 0).

export function makeLoop({ update, render }) {
  const SIM_STEP = 1 / 30;          // sim seconds per step at 1x
  let speed = 1;                    // 0 | 1 | 2 | 4
  let acc = 0;
  let last = performance.now();
  let running = false;
  let rafId = 0;

  function frame(now) {
    if (!running) return;
    let dtReal = (now - last) / 1000;
    last = now;
    if (dtReal > 0.25) dtReal = 0.25; // tab-switch guard

    acc += dtReal * speed;
    let steps = 0;
    while (acc >= SIM_STEP && steps < 40) {
      update(SIM_STEP);
      acc -= SIM_STEP;
      steps++;
    }
    render(dtReal);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    setSpeed(s) { speed = s; },
    getSpeed() { return speed; },
  };
}
