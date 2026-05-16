Promise.all([
    d3.json("data/states.geojson"),
    d3.csv("data/state_clean.csv"),
    d3.csv("data/age_clean.csv"),
    d3.csv("data/road_user_clean.csv"),
    d3.csv("data/sex_clean.csv"),
    d3.csv("data/counterparty_clean.csv")
]).then(([geoData, stateData, ageData, roadUserData, sexData, counterpartyData]) => {

    stateData.forEach(d => {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    ageData.forEach(d => {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    roadUserData.forEach(d => {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    sexData.forEach(d => {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    counterpartyData.forEach(d => {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    const latestYear = 2016;
    const filteredStateData = stateData.filter(d => d.year === latestYear);

    const dataByState = {};
    filteredStateData.forEach(d => {
        dataByState[d.state] = d;
    });

    const width = 800;
    const height = 600;

    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("#tooltip");

    const projection = d3.geoMercator()
        .center([134, -28])
        .scale(700)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const color = d3.scaleSequential()
        .domain([0, d3.max(filteredStateData, d => d.cases)])
        .interpolator(d3.interpolateBlues);

    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const stateName = d.properties.STATE_NAME;
            const row = dataByState[stateName];
            return row ? color(row.cases) : "#ccc";
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 1)

        // hover tooltip
        .on("mouseover", function(event, d) {
            const stateName = d.properties.STATE_NAME;
            const row = dataByState[stateName];

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${stateName}</strong><br>
                    Cases: ${row ? row.cases : "No data"}<br>
                    Bed days: ${row ? row.bed_days : "No data"}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", event.pageX + 15 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        })

        // state click filtering
        .on("click", function(event, d) {
            const stateName = d.properties.STATE_NAME;

            d3.selectAll("path")
                .attr("stroke", "#333")
                .attr("stroke-width", 1);

            d3.select(this)
                .attr("stroke", "red")
                .attr("stroke-width", 3);

            showStateDetails(
                stateName,
                stateData,
                ageData,
                roadUserData,
                sexData,
                counterpartyData
            );
        });

}).catch(error => {
    console.error("Error loading files:", error);
});


function showStateDetails(stateName, stateData, ageData, roadUserData, sexData, counterpartyData) {

    const stateRows = stateData.filter(d => d.state === stateName);

    const totalCases = d3.sum(stateRows, d => d.cases);
    const totalBedDays = d3.sum(stateRows, d => d.bed_days);

    const highestYear = stateRows.reduce((max, d) => d.cases > max.cases ? d : max, stateRows[0]);

    const latestYear = 2016;

    const topAge = ageData
        .filter(d => d.year === latestYear)
        .sort((a, b) => b.cases - a.cases)[0];

    const topRoadUser = roadUserData
        .filter(d => d.year === latestYear)
        .sort((a, b) => b.cases - a.cases)[0];

    const topSex = sexData
        .filter(d => d.year === latestYear)
        .sort((a, b) => b.cases - a.cases)[0];

    const topCounterparty = counterpartyData
        .filter(d => d.year === latestYear)
        .sort((a, b) => b.cases - a.cases)[0];

    d3.select("#details").html(`
        <h2>${stateName}</h2>

        <div class="stat-card">
            <h3>Total accident cases</h3>
            <p>${totalCases}</p>
        </div>

        <div class="stat-card">
            <h3>Total hospital bed days</h3>
            <p>${totalBedDays}</p>
        </div>

        <div class="stat-card">
            <h3>Highest accident year</h3>
            <p>${highestYear ? highestYear.year : "N/A"}</p>
        </div>

        <div class="stat-card">
            <h3>Most affected age group</h3>
            <p>${topAge ? topAge.age_group : "N/A"}</p>
        </div>

        <div class="stat-card">
            <h3>Highest road user category</h3>
            <p>${topRoadUser ? topRoadUser.road_user : "N/A"}</p>
        </div>

        <div class="stat-card">
            <h3>Highest sex category</h3>
            <p>${topSex ? topSex.sex : "N/A"}</p>
        </div>

        <div class="stat-card">
            <h3>Main counterparty involved</h3>
            <p>${topCounterparty ? topCounterparty.counterparty : "N/A"}</p>
        </div>
    `);
}