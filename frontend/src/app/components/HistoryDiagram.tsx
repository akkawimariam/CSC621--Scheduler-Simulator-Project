import React, { useRef, useEffect } from 'react';
import type { Operation } from '../utils/api';

interface HistoryDiagramProps {
  operations: Operation[];
  numTransactions: number;
}

export function HistoryDiagram({ operations, numTransactions }: HistoryDiagramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#faf5ff');
    gradient.addColorStop(1, '#ede9fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const rowHeight = 60;
    const leftMargin = 80;
    const rightMargin = 40;
    const topMargin = 40;
    const opWidth = Math.max(60, (width - leftMargin - rightMargin) / operations.length);

    // Draw transaction rows
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#1e293b';
    
    for (let i = 1; i <= numTransactions; i++) {
      const y = topMargin + (i - 1) * rowHeight;
      ctx.fillText(`T${i}`, 20, y + 25);
      
      // Draw horizontal line for transaction with purple gradient
      const lineGradient = ctx.createLinearGradient(leftMargin, 0, width - rightMargin, 0);
      lineGradient.addColorStop(0, '#e9d5ff');
      lineGradient.addColorStop(1, '#ddd6fe');
      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftMargin, y + 20);
      ctx.lineTo(width - rightMargin, y + 20);
      ctx.stroke();
    }

    // Track last position of each transaction
    const lastPos: { [key: number]: { x: number; y: number } } = {};

    // Define transaction colors in purple haze palette
    const transactionColors = [
      '#7c3aed', // purple-600
      '#8b5cf6', // violet-500
      '#6366f1', // indigo-500
      '#a855f7', // purple-500
      '#7c69ef', // blend
      '#8b5cf6', // violet-500
    ];

    // Draw operations
    operations.forEach((op, index) => {
      const x = leftMargin + index * opWidth + opWidth / 2;
      const txIndex = op.transaction - 1;
      const y = topMargin + txIndex * rowHeight + 20;

      // Draw operation node with purple haze colors
      if (op.type === 'commit') {
        ctx.fillStyle = '#8b5cf6'; // violet
      } else if (op.type === 'abort') {
        ctx.fillStyle = '#ef4444'; // red
      } else if (op.type === 'write' || op.type === 'increment' || op.type === 'decrement') {
        ctx.fillStyle = '#a855f7'; // purple
      } else {
        ctx.fillStyle = '#6366f1'; // indigo
      }
      
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw white border for better visibility
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw connecting line to previous operation in same transaction
      if (lastPos[op.transaction]) {
        const color = transactionColors[(op.transaction - 1) % transactionColors.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lastPos[op.transaction].x, lastPos[op.transaction].y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      lastPos[op.transaction] = { x, y };

      // Draw operation label below
      ctx.fillStyle = '#475569';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(op.raw, x, y + 25);
    });

    // Draw conflict edges
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1 = operations[i];
        const op2 = operations[j];

        if (op1.transaction !== op2.transaction && 
            op1.dataItem && op2.dataItem && 
            op1.dataItem === op2.dataItem) {
          const isWrite1 = op1.type === 'write' || op1.type === 'increment' || op1.type === 'decrement';
          const isWrite2 = op2.type === 'write' || op2.type === 'increment' || op2.type === 'decrement';
          const isRead1 = op1.type === 'read';
          const isRead2 = op2.type === 'read';

          if ((isWrite1 && (isRead2 || isWrite2)) || (isRead1 && isWrite2)) {
            const x1 = leftMargin + i * opWidth + opWidth / 2;
            const y1 = topMargin + (op1.transaction - 1) * rowHeight + 20;
            const x2 = leftMargin + j * opWidth + opWidth / 2;
            const y2 = topMargin + (op2.transaction - 1) * rowHeight + 20;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Draw arrow
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const arrowLength = 10;
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(
              x2 - arrowLength * Math.cos(angle - Math.PI / 6),
              y2 - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(x2, y2);
            ctx.lineTo(
              x2 - arrowLength * Math.cos(angle + Math.PI / 6),
              y2 - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
        }
      }
    }

    ctx.setLineDash([]);

  }, [operations, numTransactions]);

  const canvasHeight = Math.max(300, 40 + numTransactions * 60 + 40);

  return (
    <div className="w-full border-2 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 overflow-auto shadow-inner">
      <canvas
        ref={canvasRef}
        width={Math.max(800, operations.length * 70 + 120)}
        height={canvasHeight}
        className="w-full"
      />
    </div>
  );
}
