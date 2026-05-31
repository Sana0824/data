Promise.all([
    d3.json("data/states.geojson"),
    d3.csv("data/state_clean.csv"),
    d3.csv("data/age_clean.csv"),
    d3.csv("data/road_user_clean.csv"),
    d3.csv("data/sex_clean.csv"),
    d3.csv("data/counterparty_clean.csv")
]).then(function(files) {

    const geoData = files[0];
    const stateData = files[1];
    const ageData = files[2];
    const roadUserData = files[3];
    const sexData = files[4];
    const counterpartyData = files[5];

    // Convert strings into numbers
    stateData.forEach(function(d) {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    ageData.forEach(function(d) {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    roadUserData.forEach(function(d) {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    sexData.forEach(function(d) {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    counterpartyData.forEach(function(d) {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    const latestYear = 2016;

    const filteredStateData = stateData.filter(function(d) {
        return d.year === latestYear;
    });

    // Make object for quick access
    const dataByState = {};

    filteredStateData.forEach(function(d) {
        dataByState[d.state] = d;
    });

    const width = 430;
    const height = 360;

    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const tooltip = d3.select("#tooltip");

    // Map projection
    const projection = d3.geoMercator()
        .center([134, -28])
        .scale(420)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath()
        .projection(projection);

    // Colour scale: light blue to dark blue
    const maxCases = d3.max(filteredStateData, function(d) {
        return d.cases;
    });

    const color = d3.scaleSequential()
        .domain([0, maxCases])
        .interpolator(d3.interpolateBlues);

    // Draw states
    svg.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)

        .attr("fill", function(d) {

            const stateName = d.properties.STATE_NAME;
            const row = dataByState[stateName];

            if (row) {
                return color(row.cases);
            }
            else {
                return "#e0e0e0";
            }
        })

        .attr("stroke", "#666")
        .attr("stroke-width", 1)

        // Tooltip
        .on("mouseover", function(event, d) {

            const stateName = d.properties.STATE_NAME;
            const row = dataByState[stateName];

            if (row) {
                tooltip
                    .style("opacity", 1)
                    .html(
                        "<strong>" + stateName + "</strong><br>" +
                        "Cases: " + row.cases + "<br>" +
                        "Bed Days: " + row.bed_days
                    );
            }
        })

        .on("mousemove", function(event) {

            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })

        .on("mouseout", function() {

            tooltip.style("opacity", 0);
        })

        // Click state
        .on("click", function(event, d) {

            d3.selectAll("#map path")
                .attr("stroke", "#666")
                .attr("stroke-width", 1);

            d3.select(this)
                .attr("stroke", "red")
                .attr("stroke-width", 3);

            const stateName = d.properties.STATE_NAME;
            selectedState = stateName;
            selectedRoadUser = null;
            selectedAgeGroup = null;

            // Connect map click with the visible charts
            if (typeof updateAgePieChart === "function") {
                updateAgePieChart(stateName);
            }

            if (typeof updateSeverityRadarChart === "function") {
                updateSeverityRadarChart(stateName, null);
            }

            showDetails(
                stateName,
                stateData,
                ageData,
                roadUserData,
                sexData,
                counterpartyData
            );
        });

}).catch(function(error) {

    console.log("Error loading files");
    console.log(error);

});


function convertMapStateName(stateName) {
    const stateMap = {
        "Australian Capital Territory": "ACT",
        "New South Wales": "NSW",
        "Northern Territory": "NT",
        "Queensland": "Qld",
        "South Australia": "SA",
        "Tasmania": "Tas",
        "Victoria": "Vic",
        "Western Australia": "WA"
    };

    return stateMap[stateName] || stateName;
}

// Function for details panel
function showDetails(
    stateName,
    stateData,
    ageData,
    roadUserData,
    sexData,
    counterpartyData
) {

    const rows = stateData.filter(function(d) {
        return d.state === stateName;
    });

    const totalCases = d3.sum(rows, function(d) {
        return d.cases;
    });

    const totalBedDays = d3.sum(rows, function(d) {
        return d.bed_days;
    });

    let highestYear = rows[0];

    rows.forEach(function(d) {

        if (d.cases > highestYear.cases) {
            highestYear = d;
        }
    });

    d3.select("#details")
        .html(
            "<h3>Selected State</h3>" +
            "<div class='summary-grid'>" +
            "<div><span>State</span><strong>" + convertMapStateName(stateName) + "</strong></div>" +
            "<div><span>Total cases</span><strong>" + d3.format(",")(totalCases) + "</strong></div>" +
            "<div><span>Total bed days</span><strong>" + d3.format(",")(totalBedDays) + "</strong></div>" +
            "<div><span>Highest year</span><strong>" + highestYear.year + "</strong></div>" +
            "</div>"
        );
}
