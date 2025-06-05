import { onMount, onCleanup, createEffect } from 'solid-js';
import * as d3 from 'd3';

export const StockChart = (props) => {
  let chartDiv;
  let tooltipRef = null;
  let resizeObserver = null;
  let chartInstance = null;
  let priceLineGroup = null;
  let lastRenderedData = null;

  // Separate function to update ONLY the current price line
  const updatePriceLine = (price) => {
    if (!chartInstance || !priceLineGroup || !price) return;

    const { yScale, width, height } = chartInstance;
    const priceY = yScale(price);
    
    // Remove existing price line elements
    priceLineGroup.selectAll('*').remove();
    
    // Price line
    priceLineGroup.append('line')
      .attr('class', 'current-price-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', priceY)
      .attr('y2', priceY)
      .attr('stroke', '#ffaa00')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5,3')
      .style('opacity', 0.8);
    
    // Price label background
    const priceText = `$${price.toFixed(2)}`;
    const textWidth = priceText.length * 7 + 10;
    
    priceLineGroup.append('rect')
      .attr('class', 'current-price-label-bg')
      .attr('x', width + 2)
      .attr('y', priceY - 10)
      .attr('width', textWidth)
      .attr('height', 20)
      .attr('fill', '#ffaa00')
      .attr('rx', 2);
    
    // Price label text
    priceLineGroup.append('text')
      .attr('class', 'current-price-label')
      .attr('x', width + 5)
      .attr('y', priceY + 4)
      .text(priceText)
      .attr('fill', '#000')
      .style('font-size', '12px')
      .style('font-weight', 'bold');
  };

  const renderChart = () => {
    if (!chartDiv) return;
    
    // Check if container has dimensions
    const rect = chartDiv.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.log(`Container not ready for ${props.ticker} ${props.type} chart`);
      return;
    }
    
    // Wait for data to be available
    if (!props.data || props.data.length === 0) {
      console.log(`No data available for ${props.ticker} ${props.type} chart`);
      return;
    }

    // Check if data has actually changed
    const dataString = JSON.stringify(props.data);
    if (lastRenderedData === dataString) {
      console.log(`Data unchanged for ${props.ticker} ${props.type}, skipping re-render`);
      // Just update the price line if needed
      if (props.currentPrice) {
        updatePriceLine(props.currentPrice);
      }
      return;
    }
    lastRenderedData = dataString;

    console.log(`Rendering ${props.ticker} ${props.type} chart with ${props.data.length} data points`);

    // Clear any existing chart and tooltip
    d3.select(chartDiv).selectAll("*").remove();
    if (tooltipRef) {
      tooltipRef.remove();
      tooltipRef = null;
    }
    chartInstance = null;
    priceLineGroup = null;

    // Dimensions and margins
    const margin = { top: 10, right: 60, bottom: 30, left: 50 };
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
    
    // Include current price in Y scale if provided
    let adjustedYMin = yMin;
    let adjustedYMax = yMax;
    if (props.currentPrice) {
      adjustedYMin = Math.min(yMin, props.currentPrice);
      adjustedYMax = Math.max(yMax, props.currentPrice);
    }
    
    const yPadding = (adjustedYMax - adjustedYMin) * 0.1;
    
    const yScale = d3.scaleLinear()
      .domain([adjustedYMin - yPadding, adjustedYMax + yPadding])
      .range([height, 0]);

    // Store chart instance data for price line updates
    chartInstance = { yScale, width, height };

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
      // For intraday charts, show time based on data density
      const dataCount = data.length;
      let tickInterval;
      
      if (dataCount <= 60) {
        // Less than 1 hour of data: show every 15 minutes
        tickInterval = 15;
      } else if (dataCount <= 195) {
        // Less than 3.25 hours: show every 30 minutes
        tickInterval = 30;
      } else {
        // Full day: show every hour
        tickInterval = 60;
      }
      
      xAxis = d3.axisBottom(xScale)
        .tickValues(data
          .filter((d, i) => {
            const minutes = d.x.getMinutes();
            return minutes % tickInterval === 0;
          })
          .map(d => d.x)
        )
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
      // For 1-minute intraday data
      const pixelsPerBar = width / data.length;
      barWidth = Math.max(1, Math.min(10, pixelsPerBar * 0.7));
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

    // Create a separate group for the price line that can be updated independently
    priceLineGroup = g.append('g').attr('class', 'price-line-group');
    
    // Initial price line render
    if (props.currentPrice) {
      updatePriceLine(props.currentPrice);
    }

    // Highlight the last candle if it's recent (within last minute for intraday)
    const lastCandle = data[data.length - 1];
    const now = new Date();
    const timeDiff = now - lastCandle.x;
    const isRecent = props.type === 'intraday' ? timeDiff < 120000 : timeDiff < 86400000; // 2 minutes for intraday, 1 day for daily

    if (isRecent) {
      // Add pulsing effect to last candle
      g.append('rect')
        .attr('class', 'last-candle-highlight')
        .attr('x', props.type === 'daily' 
          ? xScale(lastCandle.x) + (xScale.bandwidth() - barWidth) / 2 - 2
          : xScale(lastCandle.x) - barWidth / 2 - 2)
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
          return xScale(d.x);
        } else {
          // For time scale with 1-minute bars
          if (i === 0) return 0;
          const prevX = xScale(data[i - 1].x);
          const currX = xScale(d.x);
          return (prevX + currX) / 2;
        }
      })
      .attr('y', 0)
      .attr('width', (d, i) => {
        if (props.type === 'daily') {
          return xScale.bandwidth();
        } else {
          // For 1-minute bars
          if (i === data.length - 1) {
            return width - xScale(d.x);
          } else {
            const nextX = xScale(data[i + 1].x);
            const currX = xScale(d.x);
            return nextX - currX;
          }
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
            <div style="color: #888;">Open:</div><div style="text-align: right;">$${d.o.toFixed(2)}</div>
            <div style="color: #888;">High:</div><div style="text-align: right;">$${d.h.toFixed(2)}</div>
            <div style="color: #888;">Low:</div><div style="text-align: right;">$${d.l.toFixed(2)}</div>
            <div style="color: #888;">Close:</div><div style="text-align: right;">$${d.c.toFixed(2)}</div>
            <div style="color: #888;">Change:</div><div style="text-align: right; color: ${changeColor}">${changeAmount >= 0 ? '+' : ''}${changeAmount.toFixed(2)} (${changeAmount >= 0 ? '+' : ''}${changePercent}%)</div>
            <div style="color: #888;">Volume:</div><div style="text-align: right;">${d.volume >= 1000000 ? `${(d.volume / 1000000).toFixed(2)}M` : d.volume >= 1000 ? `${(d.volume / 1000).toFixed(0)}K` : d.volume}</div>
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

  // Use ResizeObserver to detect when container becomes visible
  onMount(() => {
    if (chartDiv) {
      // Create ResizeObserver to detect when container gets dimensions
      resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            // Container is visible, render chart
            requestAnimationFrame(() => {
              renderChart();
            });
          }
        }
      });
      
      resizeObserver.observe(chartDiv);
      
      // Also try rendering after a small delay as fallback
      setTimeout(() => {
        renderChart();
      }, 100);
    }
  });
  
  // Separate effects for data changes and price updates
  createEffect(() => {
    // Track only data changes for full re-render
    const data = props.data;
    
    if (data && data.length > 0) {
      console.log(`Data updated for ${props.ticker} ${props.type}, checking if re-render needed`);
      requestAnimationFrame(() => {
        renderChart();
      });
    }
  });

  // Separate effect for price line updates only
  createEffect(() => {
    // Track only currentPrice changes
    const currentPrice = props.currentPrice;
    
    if (currentPrice && chartInstance && priceLineGroup) {
      console.log(`Price updated for ${props.ticker} ${props.type}: $${currentPrice.toFixed(2)}`);
      updatePriceLine(currentPrice);
    }
  });

  // Handle resize
  const handleResize = () => {
    if (chartDiv && props.data && props.data.length > 0) {
      // Reset lastRenderedData to force re-render on resize
      lastRenderedData = null;
      requestAnimationFrame(() => {
        renderChart();
      });
    }
  };

  onMount(() => {
    window.addEventListener('resize', handleResize);
  });

  // Cleanup
  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    d3.select(chartDiv).selectAll("*").remove();
    if (tooltipRef) {
      tooltipRef.remove();
      tooltipRef = null;
    }
    chartInstance = null;
    priceLineGroup = null;
    lastRenderedData = null;
  });

  return <div ref={chartDiv} style={{ width: '100%', height: '400px' }} />;
};