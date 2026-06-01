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

    drawAustraliaMap(geoData, stateData, ageData, roadUserData, sexData, counterpartyData);

    d3.select("#backButton").on("click", function() {
        drawAustraliaMap(geoData, stateData, ageData, roadUserData, sexData, counterpartyData);
    });

}).catch(function(error) {
    console.log("Error loading files");
    console.log(error);
});


function drawAustraliaMap(geoData, stateData, ageData, roadUserData, sexData, counterpartyData) {

    d3.select("#map").html("");
    d3.select("#backButton").style("display", "none");

    const latestYear = 2016;

    const filteredStateData = stateData.filter(function(d) {
        return d.year === latestYear;
    });

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

    const projection = d3.geoMercator()
        .center([134, -28])
        .scale(700)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const maxCases = d3.max(filteredStateData, function(d) {
        return d.cases;
    });

    const color = d3.scaleSequential()
        .domain([maxCases, 0])
        .interpolator(d3.interpolateRdYlGn);

    const tooltip = d3.select("#tooltip");

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
            } else {
                return "#ccc";
            }
        })
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .on("mouseover", function(event, d) {
            const stateName = d.properties.STATE_NAME;
            const row = dataByState[stateName];

            tooltip
                .style("opacity", 1)
                .html(
                    "<strong>" + stateName + "</strong><br>" +
                    "Cases: " + (row ? row.cases : "No data") + "<br>" +
                    "Bed Days: " + (row ? row.bed_days : "No data")
                );
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        })
        .on("click", function(event, d) {
            const stateName = d.properties.STATE_NAME;
            selectedState = stateName;
            selectedRoadUser = null;
            selectedAgeGroup = null;

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

            drawStateMap(stateName);
        });
}


function drawStateMap(stateName) {

    d3.select("#map").html("");
    d3.select("#backButton").style("display", "block");

    let fileName = "";

    if (stateName === "NSW") {
        fileName = "data/suburb-10-nsw.geojson";
    }
    else if (stateName === "Vic") {
        fileName = "data/suburb-10-vic.geojson";
    }
    else if (stateName === "Qld") {
        fileName = "data/suburb-10-qld.geojson";
    }
    else if (stateName === "SA") {
        fileName = "data/suburb-10-sa.geojson";
    }
    else if (stateName === "WA") {
        fileName = "data/suburb-10-wa.geojson";
    }
    else if (stateName === "Tas") {
        fileName = "data/suburb-10-tas.geojson";
    }
    else if (stateName === "NT") {
        fileName = "data/suburb-10-nt.geojson";
    }
    else {
        d3.select("#map").html("<p>No detailed map available for this state.</p>");
        return;
    }

    d3.json(fileName).then(function(stateMap) {

        const width = 800;
        const height = 600;

        const svg = d3.select("#map")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const projection = d3.geoMercator()
            .fitSize([width, height], stateMap);

        const path = d3.geoPath().projection(projection);

        const tooltip = d3.select("#tooltip");

        svg.selectAll("path")
            .data(stateMap.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", function(d, i) {
                return d3.interpolateYlOrRd(i / stateMap.features.length);
            })
            .attr("stroke", "black")
            .attr("stroke-width", 0.4)
            .on("mouseover", function(event, d) {

                let areaName = "Area";

                if (d.properties.vic_loca_2) {
                areaName = d.properties.vic_loca_2;
                }
                else if (d.properties.nsw_loca_2) {
                areaName = d.properties.nsw_loca_2;
                }
                else if (d.properties.qld_loca_2) {
                areaName = d.properties.qld_loca_2;
                }
                else if (d.properties.sa_loca_2) {
                areaName = d.properties.sa_loca_2;
                }
                else if (d.properties.wa_loca_2) {
                areaName = d.properties.wa_loca_2;
                }
                else if (d.properties.tas_loca_2) {
                areaName = d.properties.tas_loca_2;
                }
                else if (d.properties.nt_loca_2) {
                areaName = d.properties.nt_loca_2;
            }

    // make hovered area brighter
            d3.select(this)
            .attr("stroke", "blue")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.8);

            tooltip
            .style("opacity", 1)
            .html(
                "<strong>" + areaName + "</strong><br>" +
                "Region inside " + stateName
            );
        })

        .on("mousemove", function(event) {

            tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })

        .on("mouseout", function() {

            d3.select(this)
            .attr("stroke", "black")
            .attr("stroke-width", 0.4)
            .attr("opacity", 1);

            tooltip.style("opacity", 0);
        })

    }).catch(function(error) {
        console.log("Could not load state map");
        console.log(error);
        d3.select("#map").html("<p>State map could not be loaded.</p>");
    });
}


function showDetails(stateName, stateData, ageData, roadUserData, sexData, counterpartyData) {

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

    d3.select("#details").html(
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
