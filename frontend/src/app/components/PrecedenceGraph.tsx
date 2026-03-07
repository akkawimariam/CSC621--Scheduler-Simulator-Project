import React, { useRef, useEffect } from 'react';
import type { ConflictEdge } from '../utils/api';

interface PrecedenceGraphProps {
  nodes: number[];
  edges: ConflictEdge[];
}

export function PrecedenceGraph({ nodes, edges }: PrecedenceGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#faf5ff');
    gradient.addColorStop(1, '#ede9fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const n = nodes.length;
    if (n === 0) return;

    const radius = Math.min(width, height) * 0.35;
    const nodePositions: { [id: number]: { x: number; y: number } } = {};
    nodes.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      nodePositions[id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    const nodeRadius = 24;
    const arrowLen = 12;

    ctx.strokeStyle = '#a78bfa';
    ctx.fillStyle = '#a78bfa';
    ctx.lineWidth = 2;

    edges.forEach((edge) => {
      const from = nodePositions[edge.from];
      const to = nodePositions[edge.to];
      if (!from || !to) return;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const startX = from.x + ux * nodeRadius;
      const startY = from.y + uy * nodeRadius;
      const endX = to.x - ux * nodeRadius;
      const endY = to.y - uy * nodeRadius;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - arrowLen * Math.cos(angle - Math.PI / 6),
        endY - arrowLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - arrowLen * Math.cos(angle + Math.PI / 6),
        endY - arrowLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    nodes.forEach((id) => {
      const pos = nodePositions[id];
      if (!pos) return;

      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`T${id}`, pos.x, pos.y);
    });
  }, [nodes, edges]);

  return (
    <div className="w-full border-2 rounded-lg bg-gradient-to-br from-brand-a-50 to-brand-b-50 border-brand-a-200 overflow-auto shadow-inner">
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full"
      />
    </div>
  );
}