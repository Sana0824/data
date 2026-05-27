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

    // make object for quick access
    const dataByState = {};

    filteredStateData.forEach(function(d) {
        dataByState[d.state] = d;
    });

    const width = 800;
    const height = 600;

    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("#tooltip");

    // map projection
    const projection = d3.geoMercator()
        .center([134, -28])
        .scale(700)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath()
        .projection(projection);

    // colour scale
    const maxCases = d3.max(filteredStateData, function(d) {
        return d.cases;
    });

    const color = d3.scaleSequential()
        .domain([maxCases, 0])
        .interpolator(d3.interpolateRdYlGn);

    // draw states
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
                return "#ccc";
            }
        })

        .attr("stroke", "black")
        .attr("stroke-width", 1)

        // tooltip
        .on("mouseover", function(event, d) {

            const stateName = d.properties.STATE_NAME;

            const row = dataByState[stateName];

            tooltip
                .style("opacity", 1)
                .html(
                    "<strong>" + stateName + "</strong><br>" +
                    "Cases: " + row.cases + "<br>" +
                    "Bed Days: " + row.bed_days
                );
        })

        .on("mousemove", function(event) {

            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })

        .on("mouseout", function() {

            tooltip.style("opacity", 0);
        })

        
        .on("click", function(event, d) {

            d3.selectAll("path")
                .attr("stroke", "black")
                .attr("stroke-width", 1);

            d3.select(this)
                .attr("stroke", "blue")
                .attr("stroke-width", 3);

            const stateName = d.properties.STATE_NAME;

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

   
    const topAge = ageData.sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    
    const topRoadUser = roadUserData.sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

   
    const topSex = sexData.sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    
    const topCounterparty = counterpartyData.sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    d3.select("#details")
        .html(

            "<h2>" + stateName + "</h2>" +

            "<div class='stat-card'>" +
            "<h3>Total Accident Cases</h3>" +
            "<p>" + totalCases + "</p>" +
            "</div>" +

            "<div class='stat-card'>" +
            "<h3>Total Hospital Bed Days</h3>" +
            "<p>" + totalBedDays + "</p>" +
            "</div>" +

            "<div class='stat-card'>" +
            "<h3>Highest Accident Year</h3>" +
            "<p>" + highestYear.year + "</p>" +
            "</div>" +

            "<div class='stat-card'>" +
            "<h3>Most Affected Age Group</h3>" +
            "<p>" + topAge.age_group + "</p>" +
            "</div>" +

            "<div class='stat-card'>" +
            "<h3>Highest Road User Type</h3>" +
            "<p>" + topRoadUser.road_user + "</p>" +
            "</div>" +

            "<div class='stat-card'>" +
            "<h3>Highest Gender Category</h3>" +
            "<p>" + topSex.sex + "</p>" +
            "</div>" +

            "<div class='stat-card'>" +
            "<h3>Main Counterparty</h3>" +
            "<p>" + topCounterparty.counterparty + "</p>" +
            "</div>"
        );
}