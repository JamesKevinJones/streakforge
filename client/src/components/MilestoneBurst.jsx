import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/motion';

const COLORS = ['#ff4d00', '#ffb800', '#17b854', '#2e6ff2', '#14110f'];
const PARTICLE_COUNT = 18;

/**
 * A hand-built DOM confetti burst (not a library — 18 divs don't justify
 * one) fired once when `milestone` changes to a truthy value. Center-out
 * stagger per the design-engineering skill's guidance for celebratory
 * moments; 600-1200ms budget for a rare, high-delight event.
 */
export default function MilestoneBurst({ milestone }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!milestone || !containerRef.current || prefersReducedMotion()) return;

    const container = containerRef.current;
    container.innerHTML = '';
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.left = '50%';
      el.style.top = '50%';
      el.style.width = '8px';
      el.style.height = '8px';
      el.style.background = COLORS[i % COLORS.length];
      el.style.border = '1.5px solid #14110f';
      container.appendChild(el);
      particles.push(el);
    }

    const angleStep = (Math.PI * 2) / PARTICLE_COUNT;
    const tl = gsap.timeline({ onComplete: () => { container.innerHTML = ''; } });

    particles.forEach((el, i) => {
      const angle = angleStep * i + (Math.random() - 0.5) * 0.4;
      const distance = 60 + Math.random() * 50;
      tl.to(el, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        rotation: Math.random() * 360,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
      }, i * 0.012);
    });

    return () => tl.kill();
  }, [milestone]);

  return <div ref={containerRef} className="milestone-burst" aria-hidden="true" />;
}
