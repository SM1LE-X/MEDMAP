import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { Node, Link, GraphData } from '../types';

interface MindMapProps {
  data: GraphData;
  onNodeClick: (node: Node) => void;
}

// Helper function to create a stable ID for a link, regardless of whether
// source/target are strings or Node objects. This is the key fix for preventing
// links from "detaching" during an update.
const getStableLinkId = (d: Link): string => {
  const sourceId = typeof d.source === 'string' ? d.source : (d.source as Node).id;
  const targetId = typeof d.target === 'string' ? d.target : (d.target as Node).id;
  return `${sourceId}-${targetId}`;
};

const MindMap: React.FC<MindMapProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const d3Refs = useRef<{
    simulation: d3.Simulation<Node, Link>;
    g?: d3.Selection<SVGGElement, unknown, null, undefined>;
    linkGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
    nodeGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
    tooltip?: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  } | null>(null);

  // Initialize simulation and other static D3 elements
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || d3Refs.current) return; // Initialize only once

    const { width, height } = containerRef.current.getBoundingClientRect();
    
    const simulation = d3.forceSimulation<Node>()
      .force("link", d3.forceLink<Node, Link>().id(d => d.id).distance(150).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("collide", d3.forceCollide<Node>().strength(0.8).radius(d => (Math.max(d.width || 0, d.height || 0) / 2) + 8))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "glow");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", "3.5")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g");

    // === Layer groups: links first, nodes after ===
    const linkGroup = g.append("g").attr("class", "links");
    const nodeGroup = g.append("g").attr("class", "nodes");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("z-index", "10")
      .style("visibility", "hidden")
      .style("background", "rgba(17, 24, 39, 0.8)")
      .style("backdrop-filter", "blur(5px)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "14px")
      .style("pointer-events", "none")
      .style("border", "1px solid rgba(107, 114, 128, 0.5)");

    d3Refs.current = { simulation, g, linkGroup, nodeGroup, tooltip };
  }, []);

  // Update visualization based on data changes
  useEffect(() => {
    if (!d3Refs.current || !d3Refs.current.nodeGroup || !d3Refs.current.linkGroup) return;

    const { simulation, nodeGroup, linkGroup, tooltip } = d3Refs.current;

    // === DATA JOIN for links (inside linkGroup - ensures links are behind) ===
    const link = linkGroup.selectAll<SVGLineElement, Link>(".link")
      .data(data.links, getStableLinkId)
      .join(
        enter => enter.append("line").attr("class", "link"),
        update => update,
        exit => exit.remove()
      )
      .attr("stroke", "rgba(107, 114, 128, 0.5)")
      .attr("stroke-width", 1.5)
      .attr("stroke-linecap", "round");

    // Ensure link group stays behind node group (defensive -- should already be)
    linkGroup.lower();

    // === DATA JOIN for nodes (inside nodeGroup) ===
    const nodeContainer = nodeGroup.selectAll<SVGGElement, Node>(".node-container")
      .data(data.nodes, (d: Node) => d.id)
      .join(
        enter => {
          const newContainer = enter.append("g")
            .attr("class", "node-container")
            .call(drag(simulation));

          const nodeContent = newContainer.append("g")
            .attr("class", "node-content");

          // rounded rect as node background
          nodeContent.append("rect")
            .attr("class", "node-rect");

          nodeContent.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .style("font-size", '16px')
            .style("pointer-events", "none");

          newContainer
            .on("click", (event, d) => {
              onNodeClick(d);
              event.stopPropagation();
            })
            .on("mouseover", function (event, d) {
              d3.select(this).select('.node-content').transition().duration(200).attr("transform", "scale(1.05)");
              tooltip?.style("visibility", "visible").html(
                `<div class="text-xs uppercase font-bold text-gray-400">${d.data.relation} &bull; ${d.data.system || 'General'}</div>` +
                `<div class="text-base">${d.data.concept}</div>`
              );
            })
            .on("mousemove", function (event) {
              tooltip?.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
              d3.select(this).select('.node-content').transition().duration(200).attr("transform", "scale(1)");
              tooltip?.style("visibility", "hidden");
            });

          return newContainer;
        },
        update => update,
        exit => exit.remove()
      );

    // Update text for all nodes
    nodeContainer.select("text")
      .text(d => d.id);

    // Measure and set dims
    const PADDING_X = 24;
    const PADDING_Y = 16;
    nodeContainer.each(function(d) {
      const textNode = d3.select(this).select('text').node();
      if (textNode) {
          const bbox = (textNode as SVGTextElement).getBBox();
          d.width = bbox.width + PADDING_X;
          d.height = bbox.height + PADDING_Y;
      } else {
          d.width = 60;
          d.height = 40;
      }
    });

    nodeContainer.select(".node-rect")
      .attr("width", d => d.width || 0)
      .attr("height", d => d.height || 0)
      .attr("x", d => -(d.width || 0) / 2)
      .attr("y", d => -(d.height || 0) / 2)
      .attr("rx", d => (d.height || 0) / 2)
      .attr("ry", d => (d.height || 0) / 2)
      .attr("fill", d => d.color)
      .attr("stroke", '#111827')
      .attr("stroke-width", 3)
      .style("filter", "none"); // optional: disable glow for now

    // === UPDATE SIMULATION ===
    simulation.nodes(data.nodes);
    const linkForce = simulation.force<d3.ForceLink<Node, Link>>("link");
    if (linkForce) linkForce.links(data.links);

    const collideForce = simulation.force<d3.ForceCollide<Node>>("collide");
    if (collideForce) collideForce.radius(d => (Math.max(d.width || 0, d.height || 0) / 2) + 8);
    
    simulation.on("tick", () => {
      // update link positions
      link
        .attr("x1", d => ((d.source as unknown) as Node).x || 0)
        .attr("y1", d => ((d.source as unknown) as Node).y || 0)
        .attr("x2", d => ((d.target as unknown) as Node).x || 0)
        .attr("y2", d => ((d.target as unknown) as Node).y || 0);

      // update node positions
      nodeContainer.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
    });

    simulation.alpha(0.3).restart();

  }, [data, onNodeClick]);

  const drag = (simulation: d3.Simulation<Node, undefined>) => {
    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag<SVGGElement, Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return (
    <div ref={containerRef} className="w-full h-full absolute top-0 left-0 z-10">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default MindMap;
