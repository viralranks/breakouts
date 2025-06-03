export const ChartContainer = (props) => {
    return (
      <div class="chart-column">
        <h4>{props.title}</h4>
        <div class="chart-wrapper" style={{ height: `${props.height || 400}px` }}>
          <div class="chart-placeholder">
            <canvas id={`chart-${props.title}`} />
          </div>
        </div>
      </div>
    );
  };