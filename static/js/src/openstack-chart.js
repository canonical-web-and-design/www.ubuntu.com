fetch("/static/js/data/openstack-commit-stats.json")
  .then((response) => response.json())
  .then((data) => {
    data = data.stats.slice(0, 10);
    const totals = d3.sum(data, (d) => d.metric);
    let count = 1;
    data.forEach((d) => {
      d.percentage = Math.round(100 * (d.metric / totals) * 10) / 10;
      if (d.name !== "Canonical") {
        d.displayName = "Contributor " + count;
        count++;
      } else d.displayName = d.name;
    });
    const chartData = [...data].reverse();
    drawChart(chartData);
    drawTable(data);
  });

const drawChart = (data) => {
  const aspectRatio = 0.55;
  const viewWidth = 686;
  const viewHeight = viewWidth * aspectRatio;
  const margin = { top: 20, right: 20, bottom: 20, left: 130 };
  const percentagePosition = viewWidth / 38;
  const chartWidth = viewWidth - margin.left - margin.right;
  const chartHeight = viewHeight - margin.top - margin.bottom;

  const svg = d3
    .select("#openstack-bar-chart")
    .append("svg")
    .attr("class", "svg")
    .attr("width", viewWidth)
    .attr("height", viewHeight);

  const y = d3
    .scaleBand()
    .range([chartHeight + margin.top, margin.top])
    .padding(0.25);

  const x = d3.scaleLinear().range([margin.left, chartWidth + margin.left]);

  y.domain(data.map((d) => d.displayName));
  x.domain([0, d3.max(data, (d) => +d.metric)]);

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("y", (d) => y(d.displayName))
    .attr("x", margin.left)
    .attr("height", y.bandwidth())
    .attr("width", (d) => x(d.metric) - margin.left)
    .attr("rx", "2")
    .style("fill", (d) => {
      if (d.displayName !== "Canonical") return "#666666";
      else return "#772953";
    });

  svg
    .append("g")
    .data(data)
    .attr("class", "axis")
    .attr("transform", "translate(" + (margin.left - 10) + ",0)")
    .call(d3.axisLeft(y).tickSize(0))
    .call((g) => g.select(".domain").remove());

  svg
    .selectAll("text")
    .style("font-size", "1rem")
    .style("font-weight", (d) => {
      if (d !== "Canonical") return "300";
      else return "400";
    });

  svg
    .append("g")
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "label-bar")
    .attr("y", (d) => y(d.displayName))
    .attr("x", (d) => x(d.metric))
    .attr("text-anchor", "end")
    .attr("dy", percentagePosition)
    .attr("dx", -5)
    .attr("fill", "white")
    .style("font-size", "0.875rem")
    .text((d) => d.percentage + "%");
};

const drawTable = (data) => {
  const tableHeadings = `
    <thead>
      <tr>
        <th>Company</th>
        <th class="u-align--right">Commits</th>
        <th colspan="2"></th>
      </tr>
    </thead>`;
  let tableContent = ``;
  data.forEach((d) => {
    tableContent += `<tr>
        <td>${d.displayName}</td>
        <td class="u-align--right">${d.metric}</td>
        <td colspan="2"></td>
      </tr>`;
  });

  const tableContainer = document.getElementById("openstack-table");
  tableContainer.innerHTML = `<TABLE> ${tableHeadings} <tbody> ${tableContent} </tbody> </TABLE>`;
};
