"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Network,
  User,
  Car,
  Building,
  Briefcase,
  FileText,
  ShieldAlert,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Copy,
  Cpu,
  Layers,
  Sparkles,
  Info,
  X,
  ExternalLink,
  Filter,
} from "lucide-react";
import { GraphNode, GraphLink, FraudGroup, GraphDataResponse } from "@/lib/services/graph-service";

interface FraudGraphExplorerProps {
  onSelectClaim?: (claimId: string) => void;
}

export function FraudGraphExplorer({ onSelectClaim }: FraudGraphExplorerProps) {
  const [data, setData] = useState<GraphDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClusterId, setSelectedClusterId] = useState<string>("apex-ring");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [activeTab, setActiveTab] = useState<"GRAPH" | "METHODOLOGY">("GRAPH");
  const [copiedCypher, setCopiedCypher] = useState(false);

  // Canvas pan & zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging node state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // Hover state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Dynamic simulation nodes with positions
  const [simNodes, setSimNodes] = useState<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch graph data
  const fetchGraph = useCallback(async (clusterId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/graph?cluster=${clusterId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch graph data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph(selectedClusterId);
  }, [selectedClusterId, fetchGraph]);

  // Active cluster object
  const activeCluster = useMemo(() => {
    if (!data) return null;
    return data.clusters.find((c) => c.id === selectedClusterId) || data.clusters[0];
  }, [data, selectedClusterId]);

  // Initialize node positions with radial distribution and collision relaxation
  useEffect(() => {
    if (!data?.nodes.length) return;

    const width = 800;
    const height = 550;
    const centerX = width / 2;
    const centerY = height / 2;
    const newPositions = new Map<string, { x: number; y: number; vx: number; vy: number }>();

    // Separate hubs, customers, vehicles and claims into clean radial orbits
    const garageNodes = data.nodes.filter((n) => n.type === "GARAGE");
    const agentNodes = data.nodes.filter((n) => n.type === "AGENT");
    const vehicleNodes = data.nodes.filter((n) => n.type === "VEHICLE");
    const customerNodes = data.nodes.filter((n) => n.type === "CUSTOMER");
    const claimNodes = data.nodes.filter((n) => n.type === "CLAIM");

    // Position Garages & Agents with clear central separation
    garageNodes.forEach((node, i) => {
      const angle = (i / Math.max(garageNodes.length, 1)) * Math.PI - Math.PI / 4;
      newPositions.set(node.id, {
        x: centerX + 75 + Math.cos(angle) * 35,
        y: centerY - 15 + Math.sin(angle) * 35,
        vx: 0,
        vy: 0,
      });
    });

    agentNodes.forEach((node, i) => {
      const angle = (i / Math.max(agentNodes.length, 1)) * Math.PI + (3 * Math.PI) / 4;
      newPositions.set(node.id, {
        x: centerX - 85 + Math.cos(angle) * 35,
        y: centerY - 15 + Math.sin(angle) * 35,
        vx: 0,
        vy: 0,
      });
    });

    // Vehicles positioned intermediate radius
    vehicleNodes.forEach((node, i) => {
      const angle = (i / Math.max(vehicleNodes.length, 1)) * 2 * Math.PI;
      newPositions.set(node.id, {
        x: centerX + Math.cos(angle) * 115,
        y: centerY + Math.sin(angle) * 95,
        vx: 0,
        vy: 0,
      });
    });

    // Customers on outer ring with ample spacing
    customerNodes.forEach((node, i) => {
      const angle = (i / Math.max(customerNodes.length, 1)) * 2 * Math.PI;
      newPositions.set(node.id, {
        x: centerX + Math.cos(angle) * 230,
        y: centerY + Math.sin(angle) * 190,
        vx: 0,
        vy: 0,
      });
    });

    // Claims distributed evenly in mid-outer orbit
    claimNodes.forEach((node, i) => {
      const angle = (i / Math.max(claimNodes.length, 1)) * 2 * Math.PI;
      const radius = 155 + (i % 2) * 35;
      newPositions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.85),
        vx: 0,
        vy: 0,
      });
    });

    // Fallback for any other node types
    data.nodes.forEach((node) => {
      if (!newPositions.has(node.id)) {
        newPositions.set(node.id, {
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200,
          vx: 0,
          vy: 0,
        });
      }
    });

    // Run simple force relaxation so nodes never overlap
    for (let iter = 0; iter < 65; iter++) {
      for (let i = 0; i < data.nodes.length; i++) {
        const p1 = newPositions.get(data.nodes[i].id)!;
        for (let j = i + 1; j < data.nodes.length; j++) {
          const p2 = newPositions.get(data.nodes[j].id)!;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 46;
          if (dist < minDist) {
            const force = ((minDist - dist) / dist) * 0.45;
            p1.x += dx * force;
            p1.y += dy * force;
            p2.x -= dx * force;
            p2.y -= dy * force;
          }
        }
      }
    }

    setSimNodes(newPositions);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [data]);

  // Connected neighbors of hovered or selected node
  const connectedNodeIds = useMemo(() => {
    const targetId = hoveredNodeId || selectedNode?.id;
    if (!targetId || !data) return null;

    const set = new Set<string>([targetId]);
    data.links.forEach((l) => {
      if (l.source === targetId) set.add(l.target);
      if (l.target === targetId) set.add(l.source);
    });
    return set;
  }, [hoveredNodeId, selectedNode, data]);

  // Handle Wheel Zoom (Smooth zooming toward cursor)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.14 : 0.86;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.35), 3.0);

    const mousePointX = (mouseX - pan.x) / zoom;
    const mousePointY = (mouseY - pan.y) / zoom;
    const newPanX = mouseX - mousePointX * newZoom;
    const newPanY = mouseY - mousePointY * newZoom;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Handle Pan / Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // If not clicking a node, start canvas pan
    if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).id === "canvas-bg") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggedNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setSimNodes((prev) => {
        const next = new Map(prev);
        const current = next.get(draggedNodeId);
        if (current) {
          next.set(draggedNodeId, { ...current, x: mouseX, y: mouseY });
        }
        return next;
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggedNodeId(nodeId);
    const node = data?.nodes.find((n) => n.id === nodeId);
    if (node) setSelectedNode(node);
  };

  const copyCypherCode = (cypher: string) => {
    navigator.clipboard.writeText(cypher);
    setCopiedCypher(true);
    setTimeout(() => setCopiedCypher(false), 2500);
  };

  // Node styling helper (Minimalist Neo4j aesthetics with compact node radii)
  const getNodeVisuals = (node: GraphNode) => {
    switch (node.type) {
      case "CUSTOMER":
        return {
          fill: node.isFraudCandidate ? "#0f172a" : "#334155",
          border: node.isFraudCandidate ? "#e11d48" : "#475569",
          badgeBg: node.isFraudCandidate ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200",
          icon: User,
          radius: 11,
          glow: node.isFraudCandidate ? "rgba(225, 29, 72, 0.25)" : "transparent",
        };
      case "CLAIM":
        return {
          fill: node.isFraudCandidate ? "#e11d48" : "#64748b",
          border: node.isFraudCandidate ? "#be123c" : "#475569",
          badgeBg: node.isFraudCandidate ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200",
          icon: FileText,
          radius: 8,
          glow: node.isFraudCandidate ? "rgba(225, 29, 72, 0.25)" : "transparent",
        };
      case "GARAGE":
        return {
          fill: "#1e293b",
          border: "#334155",
          badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: Building,
          radius: 14,
          glow: "transparent",
        };
      case "AGENT":
        return {
          fill: "#334155",
          border: "#475569",
          badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: Briefcase,
          radius: 13,
          glow: "transparent",
        };
      case "VEHICLE":
        return {
          fill: "#475569",
          border: "#64748b",
          badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: Car,
          radius: 10,
          glow: node.isFraudCandidate ? "rgba(225, 29, 72, 0.25)" : "transparent",
        };
      default:
        return {
          fill: "#64748b",
          border: "#475569",
          badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
          icon: Layers,
          radius: 9,
          glow: "transparent",
        };
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: Fraud Groups Selector & Stats */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-800 border border-slate-200">
                <Network className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>Neo4j Graph & Multi-Party Fraud Discovery</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                    {data?.clusters.length || 3} Detected Rings
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Interactive relationship graph uncovering collusion syndicates, shared garages & asset recycling
                </p>
              </div>
            </div>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50/70 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("GRAPH")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === "GRAPH"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                <span>Graph Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("METHODOLOGY")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                  activeTab === "METHODOLOGY"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-slate-600" />
                <span>How We Found Them</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collusion Group Filter Pills */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Select Group:</span>
          </span>

          {data?.clusters.map((cluster) => {
            const isSelected = selectedClusterId === cluster.id;
            return (
              <button
                key={cluster.id}
                onClick={() => {
                  setSelectedClusterId(cluster.id);
                  setSelectedNode(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition shadow-2xs ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    cluster.severity === "CRITICAL"
                      ? "bg-rose-500"
                      : "bg-slate-400"
                  }`}
                />
                <span>{cluster.name}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono ${
                    isSelected ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {cluster.totalClaimsCount} claims
                </span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setSelectedClusterId("all");
              setSelectedNode(null);
            }}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition shadow-2xs ${
              selectedClusterId === "all"
                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>All Ecosystem Nodes</span>
            <span className="text-[10px] opacity-75">({data?.nodes.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main View Area: Graph or Methodology */}
      {activeTab === "GRAPH" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Canvas (Neo4j Web Style Graph) */}
          <div
            ref={containerRef}
            className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] h-[620px] select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Canvas Background with Subtle Dot Grid */}
            <svg
              id="canvas-bg"
              className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
              style={{ background: "#fafafa" }}
              onWheel={handleWheel}
            >
              <defs>
                <pattern id="dot-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#e2e8f0" />
                </pattern>
                {/* Arrowhead marker for directed edges */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="14"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#94a3b8" />
                </marker>
                <marker
                  id="arrow-suspicious"
                  viewBox="0 0 10 10"
                  refX="14"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#e11d48" />
                </marker>
              </defs>

              <rect width="100%" height="100%" fill="url(#dot-pattern)" />

              {/* Transform Container */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Render Relationships (Edges) */}
                {data?.links.map((link) => {
                  const sourcePos = simNodes.get(link.source);
                  const targetPos = simNodes.get(link.target);
                  if (!sourcePos || !targetPos) return null;

                  const isConnected =
                    !connectedNodeIds ||
                    (connectedNodeIds.has(link.source) && connectedNodeIds.has(link.target));
                  const opacity = connectedNodeIds ? (isConnected ? 1 : 0.12) : 0.7;
                  const strokeColor = link.isSuspicious ? "#e11d48" : "#94a3b8";

                  const isEdgeActive =
                    showEdgeLabels ||
                    (hoveredNodeId && (link.source === hoveredNodeId || link.target === hoveredNodeId)) ||
                    (selectedNode && (link.source === selectedNode.id || link.target === selectedNode.id));

                  const midX = (sourcePos.x + targetPos.x) / 2;
                  const midY = (sourcePos.y + targetPos.y) / 2;

                  return (
                    <g key={link.id} opacity={opacity} className="transition-opacity duration-200">
                      <line
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke={strokeColor}
                        strokeWidth={link.isSuspicious ? 1.75 : 1.25}
                        strokeDasharray={link.isSuspicious ? "3 3" : undefined}
                        markerEnd={link.isSuspicious ? "url(#arrow-suspicious)" : "url(#arrow)"}
                      />
                      {isEdgeActive && (
                        <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none select-none">
                          <rect
                            x="-22"
                            y="-7"
                            width="44"
                            height="14"
                            rx="3.5"
                            fill="#ffffff"
                            stroke="#cbd5e1"
                            strokeWidth="1"
                            opacity="0.96"
                            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                          />
                          <text
                            textAnchor="middle"
                            y="3"
                            className="text-[8px] font-mono fill-slate-600 font-semibold"
                          >
                            {link.type}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {data?.nodes.map((node) => {
                  const pos = simNodes.get(node.id);
                  if (!pos) return null;

                  const visuals = getNodeVisuals(node);
                  const isSelected = selectedNode?.id === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isConnected = !connectedNodeIds || connectedNodeIds.has(node.id);
                  const opacity = connectedNodeIds ? (isConnected ? 1 : 0.15) : 1;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      opacity={opacity}
                      onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="cursor-pointer transition-opacity duration-200"
                    >
                      {/* Glow halo on suspicious or selected nodes */}
                      {(node.isFraudCandidate || isSelected) && (
                        <circle
                          r={visuals.radius + (isSelected ? 5 : 4)}
                          fill={visuals.fill}
                          opacity={isSelected ? 0.35 : 0.18}
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r={isHovered ? visuals.radius + 2 : visuals.radius}
                        fill={visuals.fill}
                        stroke={isSelected ? "#0f172a" : visuals.border}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        className="transition-all duration-150"
                      />

                      {/* Node Center Glyph */}
                      <text
                        textAnchor="middle"
                        y={visuals.radius >= 12 ? "3.5" : "3"}
                        fill="#ffffff"
                        fontSize={Math.max(visuals.radius * 0.72, 6.5)}
                        fontWeight="bold"
                        className="pointer-events-none select-none font-mono"
                      >
                        {node.type[0]}
                      </text>

                      {/* Node Label Text: ONLY shown when hovered or selected */}
                      {(isHovered || isSelected) && (
                        <g transform={`translate(0, ${visuals.radius + 13})`} className="pointer-events-none select-none">
                          <rect
                            x={-(node.label.length * 3.4 + 7)}
                            y="-8"
                            width={node.label.length * 6.8 + 14}
                            height="16"
                            rx="4"
                            fill="#0f172a"
                            stroke="#334155"
                            strokeWidth="1"
                            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                          />
                          <text
                            textAnchor="middle"
                            y="3"
                            className="text-[9px] font-mono font-bold fill-white"
                          >
                            {node.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Hover Tooltip Card Overlay */}
            {hoveredNodeId && (
              (() => {
                const hoveredNode = data?.nodes.find((n) => n.id === hoveredNodeId);
                const hoveredPos = simNodes.get(hoveredNodeId);
                if (!hoveredNode || !hoveredPos) return null;
                const screenX = pan.x + hoveredPos.x * zoom;
                const screenY = pan.y + hoveredPos.y * zoom;

                return (
                  <div
                    className="absolute pointer-events-none z-20 transition-all duration-75"
                    style={{
                      left: Math.min(Math.max(screenX + 16, 12), 480),
                      top: Math.min(Math.max(screenY - 32, 12), 510),
                    }}
                  >
                    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-2.5 shadow-xl backdrop-blur-md min-w-[170px] max-w-[260px] animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-bold border ${getNodeVisuals(hoveredNode).badgeBg}`}>
                          {hoveredNode.type}
                        </span>
                        {hoveredNode.isFraudCandidate && (
                          <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider">
                            Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-bold text-slate-900 truncate">{hoveredNode.label}</p>
                      {hoveredNode.sublabel && (
                        <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">{hoveredNode.sublabel}</p>
                      )}
                      {hoveredNode.riskScore && (
                        <div className="mt-1.5 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Risk Score</span>
                          <span className={`font-mono font-bold ${hoveredNode.riskScore > 75 ? "text-rose-600" : "text-amber-600"}`}>
                            {hoveredNode.riskScore}/100
                          </span>
                        </div>
                      )}
                      <p className="text-[9px] text-slate-400 mt-1 italic">Click node to inspect dossier</p>
                    </div>
                  </div>
                );
              })()
            )}

            {/* Bottom-Left Canvas Navigation Hint */}
            <div className="absolute bottom-4 left-4 hidden sm:flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 border border-slate-200/80 shadow-xs backdrop-blur-xs text-[11px] text-slate-500 font-medium">
              <span>Scroll to zoom</span>
              <span>•</span>
              <span>Drag to pan</span>
              <span>•</span>
              <span>Hover node for details</span>
            </div>

            {/* Bottom-Right Canvas HUD Controls (Interactive Zoom & View Tools) */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(Number((z + 0.2).toFixed(2)), 3.0))}
                className="rounded-xl p-1.5 text-slate-700 hover:bg-slate-100 transition active:scale-95"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="rounded-xl px-2 py-1 text-xs font-mono font-bold text-slate-700 hover:bg-slate-100 transition"
                title="Reset zoom to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(Number((z - 0.2).toFixed(2)), 0.35))}
                className="rounded-xl p-1.5 text-slate-700 hover:bg-slate-100 transition active:scale-95"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <div className="h-4 w-px bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="rounded-xl p-1.5 text-slate-700 hover:bg-slate-100 transition active:scale-95"
                title="Center & Reset View"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowEdgeLabels((prev) => !prev)}
                className={`rounded-xl px-2 py-1 text-[11px] font-mono font-semibold transition ${
                  showEdgeLabels ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                }`}
                title="Toggle Relationship Labels"
              >
                [:REL]
              </button>
            </div>

            {/* Legend Overlay */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2.5 text-[11px] font-medium bg-white/95 px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs backdrop-blur-xs">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                <span>Customer</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
                <span>Garage</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span>Agent</span>
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                <span>Vehicle</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 font-semibold">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                <span>Flagged Fraud</span>
              </span>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-2xs">
                <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 border border-slate-200 shadow-sm text-xs text-slate-700">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  <span>Loading Neo4j graph nodes...</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Inspector: Entity Details or Cluster Dossier */}
          <div className="lg:col-span-4 space-y-4">
            {selectedNode ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-semibold border ${getNodeVisuals(selectedNode).badgeBg}`}>
                      {selectedNode.type}
                    </span>
                    <h3 className="text-sm font-bold font-mono text-slate-900">{selectedNode.label}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {selectedNode.sublabel && (
                  <p className="text-xs text-slate-600 font-medium">{selectedNode.sublabel}</p>
                )}

                {/* Risk Gauge */}
                {selectedNode.riskScore && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Collusion Risk Score</span>
                      <span className={`font-mono font-bold ${selectedNode.riskScore > 75 ? "text-rose-600" : "text-amber-600"}`}>
                        {selectedNode.riskScore}/100
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedNode.riskScore > 75 ? "bg-rose-600" : "bg-amber-500"
                        }`}
                        style={{ width: `${selectedNode.riskScore}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Connected Relationships */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Connected Graph Links
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                    {data?.links
                      .filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
                      .map((l) => {
                        const otherId = l.source === selectedNode.id ? l.target : l.source;
                        const otherNode = data?.nodes.find((n) => n.id === otherId);
                        return (
                          <div
                            key={l.id}
                            onClick={() => {
                              if (otherNode) setSelectedNode(otherNode);
                            }}
                            className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition"
                          >
                            <span className="font-mono text-[10px] text-slate-500">{l.label}</span>
                            <span className="font-mono font-medium text-slate-800 text-[11px] truncate max-w-[140px]">
                              {otherNode?.label || otherId}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Action if Claim */}
                {selectedNode.type === "CLAIM" && onSelectClaim && (
                  <button
                    onClick={() => onSelectClaim(selectedNode.id)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
                  >
                    <span>Inspect Full Claim Dossier</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              /* Group Overview Dossier */
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-rose-700 border border-rose-200">
                      {activeCluster?.severity || "CRITICAL"} SYNDICATE
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      Risk: {activeCluster?.riskScore}/100
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">
                    {activeCluster?.name || "Collusion Group"}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {activeCluster?.summary}
                  </p>
                </div>

                {/* Ring Financial Exposure & Counts */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                    <span className="text-slate-400 text-[10px] block">Total Claim Exposure</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      ${activeCluster?.totalExposedAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                    <span className="text-slate-400 text-[10px] block">Converged Claims</span>
                    <span className="text-sm font-bold font-mono text-slate-900">
                      {activeCluster?.totalClaimsCount} Claims
                    </span>
                  </div>
                </div>

                {/* Key Fraud Users in Group */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Involved Fraud Users (Claimants)
                  </span>
                  <div className="space-y-2">
                    {activeCluster?.involvedClaimants.map((c) => (
                      <div
                        key={c.customerId}
                        onClick={() => {
                          const n = data?.nodes.find((node) => node.id === c.customerId);
                          if (n) setSelectedNode(n);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-slate-900">{c.customerName}</span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            ${c.totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-mono">{c.customerId}</span>
                          <span>{c.claimsCount} claims filed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shared Facilities */}
                <div className="space-y-1.5 text-xs pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Shared Intermediary Hubs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCluster?.sharedEntities.map((e) => (
                      <span
                        key={e.id}
                        className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 font-mono text-[11px] text-slate-800"
                      >
                        {e.name} ({e.id})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick CTA to Methodology */}
                <button
                  type="button"
                  onClick={() => setActiveTab("METHODOLOGY")}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition"
                >
                  <Sparkles className="h-3.5 w-3.5 text-slate-600" />
                  <span>View Step-by-Step Discovery Trail</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: HOW WE FOUND THEM (Methodology & Evidence Dossier) */
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
                Investigation Intelligence
              </span>
              <span className="text-xs font-mono text-slate-400">
                Target: {activeCluster?.name}
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
              How We Uncovered This Collusion Group
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              {activeCluster?.detectionMethodology.summary}
            </p>
          </div>

          {/* 3 Step Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeCluster?.detectionMethodology.steps.map((step) => (
              <div
                key={step.stepNumber}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white font-mono font-bold text-xs">
                    {step.stepNumber}
                  </span>
                  <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700 shadow-2xs">
                    {step.engine}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900">{step.name}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>

                {step.formula && (
                  <div className="rounded-lg bg-white border border-slate-200 p-2 font-mono text-[10px] text-slate-800">
                    <span className="text-slate-400 block text-[9px] uppercase">Formula / Metric:</span>
                    {step.formula}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Live Neo4j Cypher Proof Query */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4.5 text-white space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-slate-300" />
                <span className="text-xs font-mono font-semibold text-slate-200">
                  Executable Neo4j Cypher Path Query
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyCypherCode(activeCluster?.detectionMethodology.cypherQuery || "")}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedCypher ? "Copied!" : "Copy Cypher"}</span>
              </button>
            </div>

            <pre className="overflow-x-auto font-mono text-xs text-emerald-300 p-3 rounded-xl bg-slate-900 border border-slate-800/80">
              {activeCluster?.detectionMethodology.cypherQuery}
            </pre>
            <p className="text-[11px] text-slate-400">
              Run directly inside Neo4j Browser or Aura to traverse the multi-hop paths connecting these fraud claimants.
            </p>
          </div>

          {/* Involved Fraud Claimants Dossier Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Evidence Dossier: Identified Fraud Users & Claims
            </h4>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Customer ID</th>
                    <th className="px-4 py-2.5">Name / Identity</th>
                    <th className="px-4 py-2.5">Claims In Group</th>
                    <th className="px-4 py-2.5">Total Claimed</th>
                    <th className="px-4 py-2.5">Triggered Risk Indicators</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeCluster?.involvedClaimants.map((c) => (
                    <tr key={c.customerId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.customerId}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{c.customerName}</td>
                      <td className="px-4 py-3 font-mono">{c.claimsCount} claims</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        ${c.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {c.riskIndicators.map((r, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[10px] text-rose-800 font-mono"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
