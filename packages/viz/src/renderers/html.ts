import type { VizGraph } from '../graph'
import { THEME } from '../theme'

export interface HtmlOptions {
  title?: string
}

/**
 * VizGraph を D3.js force-directed graph を使ったインタラクティブ HTML に変換する
 */
export function renderHtml(graph: VizGraph, options?: HtmlOptions): string {
  const title = options?.title ?? 'Inngest Function Graph'
  const graphJson = JSON.stringify(graph)

  const nodeColors = THEME.colors.node
  const edgeColors = THEME.colors.edge
  const d3Config = THEME.d3

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; }
    #controls { position: fixed; top: 16px; left: 16px; z-index: 10; background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    #controls input { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; width: 250px; }
    #controls label { margin-left: 12px; font-size: 13px; color: #666; }
    .tooltip { position: absolute; background: white; border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: none; max-width: 350px; }
    .tooltip .title { font-weight: 600; margin-bottom: 4px; }
    .tooltip .meta { color: #666; font-size: 12px; }
    .legend { position: fixed; bottom: 16px; left: 16px; background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); font-size: 12px; }
    .legend-item { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .legend-swatch { width: 14px; height: 14px; border-radius: 3px; }
    svg { width: 100vw; height: 100vh; display: block; }
  </style>
</head>
<body>
  <div id="controls">
    <input type="text" id="filter" placeholder="Filter by name...">
  </div>
  <div class="legend">
    <div class="legend-item"><div class="legend-swatch" style="background:${nodeColors.function}"></div> Function</div>
    <div class="legend-item"><div class="legend-swatch" style="background:${nodeColors.event}"></div> Event</div>
    <div class="legend-item"><div class="legend-swatch" style="background:${nodeColors.cron}"></div> Cron</div>
  </div>
  <svg id="graph"></svg>
  <script>
  var graphData = ${graphJson};

  var width = window.innerWidth;
  var height = window.innerHeight;

  var colorMap = { function: '${nodeColors.function}', event: '${nodeColors.event}', cron: '${nodeColors.cron}' };
  var shapeSize = { function: 12, event: 10, cron: 8 };

  var svg = d3.select('#graph')
    .attr('width', width)
    .attr('height', height);

  var g = svg.append('g');

  // Zoom
  svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', function(e) { g.attr('transform', e.transform); }));

  // Arrow markers
  var defs = svg.append('defs');
  var arrowColors = { triggers: '${edgeColors.triggers}', sends: '${edgeColors.sends}', waitForEvent: '${edgeColors.waitForEvent}', invoke: '${edgeColors.invoke}' };
  ['triggers', 'sends', 'waitForEvent', 'invoke'].forEach(function(type) {
    defs.append('marker')
      .attr('id', 'arrow-' + type)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', arrowColors[type]);
  });

  var nodeMap = new Map(graphData.nodes.map(function(n) { return [n.id, n]; }));

  var links = graphData.edges.map(function(e) { return {
    source: e.source,
    target: e.target,
    type: e.type,
    label: e.label
  }; });

  var simulation = d3.forceSimulation(graphData.nodes)
    .force('link', d3.forceLink(links).id(function(d) { return d.id; }).distance(${d3Config.linkDistance}))
    .force('charge', d3.forceManyBody().strength(${d3Config.chargeStrength}))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(${d3Config.collisionRadius}));

  var edgeColorMap = { triggers: '${edgeColors.triggers}', sends: '${edgeColors.sends}', waitForEvent: '${edgeColors.waitForEvent}', invoke: '${edgeColors.invoke}' };

  var link = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', function(d) { return edgeColorMap[d.type] || '#999'; })
    .attr('stroke-width', function(d) { return d.type === 'invoke' ? 2.5 : 1.5; })
    .attr('stroke-dasharray', function(d) { return d.type === 'waitForEvent' ? '6,3' : null; })
    .attr('marker-end', function(d) { return 'url(#arrow-' + d.type + ')'; });

  var node = g.append('g')
    .selectAll('g')
    .data(graphData.nodes)
    .join('g')
    .call(d3.drag()
      .on('start', function(e, d) { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', function(e, d) { d.fx = e.x; d.fy = e.y; })
      .on('end', function(e, d) { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  node.append('circle')
    .attr('r', function(d) { return shapeSize[d.type] || 10; })
    .attr('fill', function(d) { return colorMap[d.type] || '#999'; })
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  node.append('text')
    .text(function(d) { return d.label; })
    .attr('x', 16)
    .attr('y', 4)
    .attr('font-size', '11px')
    .attr('fill', '#333');

  // Tooltip
  function escapeHtml(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);

  node.on('mouseover', function(e, d) {
    tooltip.transition().duration(200).style('opacity', 1);
    var html = '<div class="title">' + escapeHtml(d.label) + '</div><div class="meta">Type: ' + escapeHtml(d.type);
    if (d.metadata.filePath) html += '<br>File: ' + escapeHtml(d.metadata.filePath) + (d.metadata.line ? ':' + d.metadata.line : '');
    if (d.metadata.stepsCount !== undefined) html += '<br>Steps: ' + d.metadata.stepsCount;
    if (d.metadata.cronSchedule) html += '<br>Schedule: ' + escapeHtml(d.metadata.cronSchedule);
    html += '</div>';
    tooltip.html(html).style('left', (e.pageX + 12) + 'px').style('top', (e.pageY - 12) + 'px');
  })
  .on('mouseout', function() { tooltip.transition().duration(300).style('opacity', 0); });

  simulation.on('tick', function() {
    link
      .attr('x1', function(d) { return d.source.x; })
      .attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; })
      .attr('y2', function(d) { return d.target.y; });
    node.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
  });

  // Filter
  d3.select('#filter').on('input', function() {
    var query = this.value.toLowerCase();
    node.style('opacity', function(d) { return !query || d.label.toLowerCase().includes(query) ? 1 : 0.15; });
    link.style('opacity', function(d) {
      if (!query) return 1;
      var s = (typeof d.source === 'object' ? d.source.label : d.source).toLowerCase();
      var t = (typeof d.target === 'object' ? d.target.label : d.target).toLowerCase();
      return s.includes(query) || t.includes(query) ? 1 : 0.05;
    });
  });
  </script>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
