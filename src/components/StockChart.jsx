import { onMount, onCleanup, createEffect } from 'solid-js';
import * as d3 from 'd3';

export const StockChart = (props) => {
  let chartDiv;
  let tooltipRef = null;

  const renderChart = () => {
    if (!chartDiv) return;
    
    // Wait for data to be available
    if (!props.data || props.data.length === 0) {
      console.log(`No data available for ${props.ticker} ${props.type} chart`);
      return;
    }

    // Clear any existing chart and tooltip
    d3.select(chartDiv).selectAll("*").remove();
    if (tooltipRef) {
      tooltipRef.remove();
      tooltipRef = null;
    }

    // Dimensions and margins
    const margin = { top: 10, right: 50, bottom: 30, left: 50 };
    const width = chartDiv.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(chartDiv)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Convert string dates to Date objects if needed
    const data = props.data.map(d => ({
      ...d,
      x: d.x instanceof Date ? d.x : new Date(d.x)
    }));

    // Scales
    let xScale;
    if (props.type === 'daily') {
      // Use band scale for daily charts to eliminate weekend gaps
      xScale = d3.scaleBand()
        .domain(data.map(d => d.x))
        .range([0, width])
        .padding(0.1);
    } else {
      // Use time scale for intraday charts
      xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.x))
        .range([0, width]);
    }

    // Calculate Y scale domain with padding
    const yMin = d3.min(data, d => d.l);
    const yMax = d3.max(data, d => d.h);
    const yPadding = (yMax - yMin) * 0.1;
    
    const yScale = d3.scaleLinear()
      .domain([yMin - yPadding, yMax + yPadding])
      .range([height, 0]);

    // Volume scale (bottom 20% of chart)
    const volumeHeight = height * 0.2;
    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume)])
      .range([0, volumeHeight]);

    // Grid lines
    const xGridlines = d3.axisBottom(xScale)
      .tickSize(-height)
      .tickFormat('')
      .ticks(5);

    const yGridlines = d3.axisLeft(yScale)
      .tickSize(-width)
      .tickFormat('')
      .ticks(8);

    g.append('g')
      .attr('class', 'grid x-grid')
      .attr('transform', `translate(0,${height})`)
      .call(xGridlines)
      .style('stroke-dasharray', '2,2')
      .style('opacity', 0.3)
      .style('stroke', '#333');

    g.append('g')
      .attr('class', 'grid y-grid')
      .call(yGridlines)
      .style('stroke-dasharray', '2,2')
      .style('opacity', 0.3)
      .style('stroke', '#333');

    // X axis
    let xAxis;
    if (props.type === 'daily') {
      // For daily charts, show every 7th date to avoid crowding
      xAxis = d3.axisBottom(xScale)
        .tickValues(xScale.domain().filter((d, i) => i % 7 === 0))
        .tickFormat(d => d3.timeFormat('%b %d')(d));
    } else {
      // For intraday charts, use time-based ticks
      xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeHour.every(1))
        .tickFormat(d => {
          const easternTime = new Date(d.toLocaleString("en-US", {timeZone: "America/New_York"}));
          return d3.timeFormat('%H:%M')(easternTime);
        });
    }

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .style('color', '#666')
      .selectAll('text')
      .style('font-size', '11px');

    // Y axis
    const yAxis = d3.axisLeft(yScale)
      .ticks(8)
      .tickFormat(d => `$${d.toFixed(0)}`);

    g.append('g')
      .call(yAxis)
      .style('color', '#666')
      .selectAll('text')
      .style('font-size', '11px');

    // Calculate bar width based on scale type and data density
    let barWidth;
    if (props.type === 'daily') {
      barWidth = xScale.bandwidth() * 0.8; // Use 80% of bandwidth for daily charts
    } else {
      barWidth = Math.max(1, Math.min(20, (width / data.length) * 0.7));
    }

    // Volume bars first (so they appear behind candlesticks)
    g.selectAll('.volume')
      .data(data)
      .enter().append('rect')
      .attr('class', 'volume')
      .attr('x', d => {
        if (props.type === 'daily') {
          return xScale(d.x) + (xScale.bandwidth() - barWidth) / 2;
        } else {
          return xScale(d.x) - barWidth / 2;
        }
      })
      .attr('y', d => height - volumeScale(d.volume))
      .attr('width', barWidth)
      .attr('height', d => volumeScale(d.volume))
      .attr('fill', d => {
        if (props.type === 'daily') {
          return d.c >= d.o ? 'rgba(79, 172, 254, 0.3)' : 'rgba(244, 143, 177, 0.3)';
        } else {
          return d.c >= d.o ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 85, 0.3)';
        }
      });

    // Candlestick wicks (high-low lines)
    g.selectAll('.high-low')
      .data(data)
      .enter().append('line')
      .attr('class', 'high-low')
      .attr('x1', d => {
        if (props.type === 'daily') {
          return xScale(d.x) + xScale.bandwidth() / 2;
        } else {
          return xScale(d.x);
        }
      })
      .attr('x2', d => {
        if (props.type === 'daily') {
          return xScale(d.x) + xScale.bandwidth() / 2;
        } else {
          return xScale(d.x);
        }
      })
      .attr('y1', d => yScale(d.h))
      .attr('y2', d => yScale(d.l))
      .attr('stroke', d => {
        if (props.type === 'daily') {
          return d.c >= d.o ? '#4facfe' : '#f48fb1';
        } else {
          return d.c >= d.o ? '#00ff88' : '#ff4455';
        }
      })
      .attr('stroke-width', 1);

    // Candlestick bodies (open-close rectangles)
    g.selectAll('.candle')
      .data(data)
      .enter().append('rect')
      .attr('class', 'candle')
      .attr('x', d => {
        if (props.type === 'daily') {
          return xScale(d.x) + (xScale.bandwidth() - barWidth) / 2;
        } else {
          return xScale(d.x) - barWidth / 2;
        }
      })
      .attr('y', d => yScale(Math.max(d.o, d.c)))
      .attr('width', barWidth)
      .attr('height', d => {
        const h = Math.abs(yScale(d.o) - yScale(d.c));
        return Math.max(1, h); // Minimum height of 1px
      })
      .attr('fill', d => {
        if (props.type === 'daily') {
          return d.c >= d.o ? '#4facfe' : '#f48fb1';
        } else {
          return d.c >= d.o ? '#00ff88' : '#ff4455';
        }
      })
      .attr('stroke', d => {
        if (props.type === 'daily') {
          return d.c >= d.o ? '#4facfe' : '#f48fb1';
        } else {
          return d.c >= d.o ? '#00ff88' : '#ff4455';
        }
      })
      .attr('stroke-width', 1);

    // Highlight the last candle if it's recent (within last minute)
    const lastCandle = data[data.length - 1];
    const now = new Date();
    const timeDiff = now - lastCandle.x;
    const isRecent = timeDiff < 60000; // Within last minute

    if (isRecent && props.type === 'intraday') {
      // Add pulsing effect to last candle
      g.append('rect')
        .attr('class', 'last-candle-highlight')
        .attr('x', xScale(lastCandle.x) - barWidth / 2 - 2)
        .attr('y', yScale(Math.max(lastCandle.o, lastCandle.c)) - 2)
        .attr('width', barWidth + 4)
        .attr('height', Math.abs(yScale(lastCandle.o) - yScale(lastCandle.c)) + 4)
        .attr('fill', 'none')
        .attr('stroke', lastCandle.c >= lastCandle.o ? '#00ff88' : '#ff4455')
        .attr('stroke-width', 2)
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .style('opacity', 0.5)
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .on('end', function repeat() {
          d3.select(this)
            .transition()
            .duration(1000)
            .style('opacity', 0.5)
            .transition()
            .duration(1000)
            .style('opacity', 0)
            .on('end', repeat);
        });
    }

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.9)')
      .style('border', '1px solid #333')
      .style('border-radius', '4px')
      .style('padding', '8px 12px')
      .style('font-size', '12px')
      .style('color', '#fff')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Store tooltip reference
    tooltipRef = tooltip;

    // Add invisible rectangles for better hover detection
    g.selectAll('.hover-rect')
      .data(data)
      .enter().append('rect')
      .attr('class', 'hover-rect')
      .attr('x', (d, i) => {
        if (props.type === 'daily') {
          // For band scale, use the band position
          if (i === 0) return 0;
          return xScale(data[i - 1].x);
        } else {
          // For time scale, use the midpoint calculation
          if (i === 0) return 0;
          const prevX = xScale(data[i - 1].x);
          const currX = xScale(d.x);
          return (prevX + currX) / 2;
        }
      })
      .attr('y', 0)
      .attr('width', (d, i) => {
        if (props.type === 'daily') {
          // For band scale, use bandwidth
          return xScale.bandwidth();
        } else {
          // For time scale, calculate width
          if (i === 0 && data.length > 1) {
            return (xScale(data[1].x) - xScale(d.x)) / 2;
          } else if (i === data.length - 1 && data.length > 1) {
            return (xScale(d.x) - xScale(data[i - 1].x)) / 2;
          } else if (data.length > 1) {
            const nextX = i < data.length - 1 ? xScale(data[i + 1].x) : xScale(d.x);
            const prevX = i > 0 ? xScale(data[i - 1].x) : xScale(d.x);
            return (nextX - prevX) / 2;
          }
          return width;
        }
      })
      .attr('height', height)
      .style('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseover', function(event, d) {
        // Highlight the hovered candle
        g.selectAll('.candle').style('opacity', 0.5);
        g.selectAll('.high-low').style('opacity', 0.5);
        g.selectAll('.volume').style('opacity', 0.3);
        
        const index = data.indexOf(d);
        g.selectAll('.candle').filter((_, i) => i === index).style('opacity', 1);
        g.selectAll('.high-low').filter((_, i) => i === index).style('opacity', 1);
        g.selectAll('.volume').filter((_, i) => i === index).style('opacity', 0.6);

        tooltip.transition()
          .duration(100)
          .style('opacity', 1);
        
        const formatDate = props.type === 'intraday' 
          ? (date) => {
              const easternTime = new Date(date.toLocaleString("en-US", {timeZone: "America/New_York"}));
              return d3.timeFormat('%b %d, %H:%M ET')(easternTime);
            }
          : d3.timeFormat('%b %d, %Y');
        
        const changeAmount = d.c - d.o;
        const changePercent = ((changeAmount / d.o) * 100).toFixed(2);
        const changeColor = changeAmount >= 0 ? (props.type === 'daily' ? '#4facfe' : '#00ff88') : (props.type === 'daily' ? '#f48fb1' : '#ff4455');
        
        tooltip.html(`
          <div style="font-weight: bold; margin-bottom: 4px">${formatDate(d.x)}</div>
          <div style="display: grid; grid-template-columns: auto auto; gap: 4px 12px;">
            <div style="color: #888;">Open:</div><div style="text-align: right;">${d.o.toFixed(2)}</div>
            <div style="color: #888;">High:</div><div style="text-align: right;">${d.h.toFixed(2)}</div>
            <div style="color: #888;">Low:</div><div style="text-align: right;">${d.l.toFixed(2)}</div>
            <div style="color: #888;">Close:</div><div style="text-align: right;">${d.c.toFixed(2)}</div>
            <div style="color: #888;">Change:</div><div style="text-align: right; color: ${changeColor}">${changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)} (${changeAmount >= 0 ? '+' : ''}${changePercent}%)</div>
            <div style="color: #888;">Volume:</div><div style="text-align: right;">${(d.volume / 1000000).toFixed(2)}M</div>
          </div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        // Reset opacity
        g.selectAll('.candle').style('opacity', 1);
        g.selectAll('.high-low').style('opacity', 1);
        g.selectAll('.volume').style('opacity', 0.3);
        
        tooltip.transition()
          .duration(200)
          .style('opacity', 0);
      });

    // Add a crosshair
    const crosshairV = g.append('line')
      .attr('class', 'crosshair')
      .style('stroke', '#666')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0);

    const crosshairH = g.append('line')
      .attr('class', 'crosshair')
      .style('stroke', '#666')
      .style('stroke-dasharray', '3,3')
      .style('opacity', 0);

    svg.on('mousemove', function(event) {
      const [mx, my] = d3.pointer(event, g.node());
      
      if (mx >= 0 && mx <= width && my >= 0 && my <= height) {
        crosshairV
          .attr('x1', mx)
          .attr('x2', mx)
          .attr('y1', 0)
          .attr('y2', height)
          .style('opacity', 0.5);
          
        crosshairH
          .attr('x1', 0)
          .attr('x2', width)
          .attr('y1', my)
          .attr('y2', my)
          .style('opacity', 0.5);
      }
    });

    svg.on('mouseleave', function() {
      crosshairV.style('opacity', 0);
      crosshairH.style('opacity', 0);
    });
  };

  // Initial render
  onMount(() => {
    renderChart();
  });
  
  // Re-render when data changes
  createEffect(() => {
    // Access props.data to track changes
    const data = props.data;
    if (data && data.length > 0) {
      console.log(`Data updated for ${props.ticker} ${props.type}, re-rendering chart`);
      renderChart();
    }
  });

  // Handle resize
  const handleResize = () => {
    if (chartDiv && props.data && props.data.length > 0) {
      renderChart();
    }
  };

  onMount(() => {
    window.addEventListener('resize', handleResize);
  });

  // Cleanup
  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    d3.select(chartDiv).selectAll("*").remove();
    if (tooltipRef) {
      tooltipRef.remove();
      tooltipRef = null;
    }
  });

  return <div ref={chartDiv} style={{ width: '100%', height: '400px' }} />;
};