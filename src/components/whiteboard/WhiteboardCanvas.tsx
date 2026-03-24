'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import WBNodeCard from './WBNodeCard';
import WBToolbar from './WBToolbar';
import type { WBNode } from './types';

interface Props {
  nodes: WBNode[];
  setNodes: (updater: (prev: WBNode[]) => WBNode[]) => void;
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899'];

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function WhiteboardCanvas({ nodes, setNodes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'select' | 'note' | 'heading' | 'file'>('select');

  // Pan with middle click or when dragging on empty space
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on background (not on nodes)
    if (e.target !== containerRef.current && e.target !== containerRef.current?.firstChild) return;

    if (tool !== 'select') {
      // Place a new node
      const rect = containerRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      const newNode: WBNode = {
        id: uid(),
        type: tool === 'file' ? 'file' : tool === 'heading' ? 'heading' : 'note',
        x, y,
        width: tool === 'heading' ? 300 : 200,
        height: tool === 'heading' ? 48 : 150,
        content: tool === 'heading' ? 'Heading' : '',
        color: COLORS[nodes.length % COLORS.length],
      };
      setNodes((prev) => [...prev, newNode]);
      setTool('select');
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [tool, pan, zoom, nodes.length, setNodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (dragging) {
      const rect = containerRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
      const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
      setNodes((prev) => prev.map((n) => n.id === dragging ? { ...n, x, y } : n));
    }
  }, [isPanning, panStart, dragging, dragOffset, pan, zoom, setNodes]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragging(null);
  }, []);

  // Zoom with scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.2, zoom * delta));

    // Zoom toward cursor
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const scale = newZoom / zoom;

    setPan({
      x: cx - (cx - pan.x) * scale,
      y: cy - (cy - pan.y) * scale,
    });
    setZoom(newZoom);
  }, [zoom, pan]);

  // Double-click to create note
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== containerRef.current && e.target !== containerRef.current?.firstChild) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    const newNode: WBNode = {
      id: uid(),
      type: 'note',
      x, y,
      width: 200,
      height: 150,
      content: '',
      color: COLORS[nodes.length % COLORS.length],
    };
    setNodes((prev) => [...prev, newNode]);
  }, [pan, zoom, nodes.length, setNodes]);

  const startDrag = useCallback((nodeId: string, offsetX: number, offsetY: number) => {
    setDragging(nodeId);
    setDragOffset({ x: offsetX, y: offsetY });
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<WBNode>) => {
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, ...updates } : n));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  }, [setNodes]);

  // Grid pattern
  const gridSize = 40 * zoom;
  const gridOffsetX = pan.x % gridSize;
  const gridOffsetY = pan.y % gridSize;

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
        }}
      />

      {/* Canvas area */}
      <div
        ref={containerRef}
        className={`absolute inset-0 ${isPanning ? 'cursor-grabbing' : tool === 'select' ? 'cursor-grab' : 'cursor-crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        {/* Transformed layer */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {nodes.map((node) => (
            <WBNodeCard
              key={node.id}
              node={node}
              onStartDrag={startDrag}
              onUpdate={updateNode}
              onDelete={deleteNode}
              zoom={zoom}
            />
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <WBToolbar tool={tool} setTool={setTool} zoom={zoom} setZoom={setZoom} />

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 text-[10px] text-stone-600 font-mono bg-background/80 px-2 py-1 rounded-md border border-border">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
