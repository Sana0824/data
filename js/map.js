let mapDashboardData = null;

Promise.all([
    d3.json("data/states.geojson"),
    d3.csv("data/state_clean.csv"),
    d3.csv("data/age_clean.csv"),
    d3.csv("data/road_user_clean.csv"),
    d3.csv("data/sex_clean.csv"),
    d3.csv("data/counterparty_clean.csv"),
    d3.csv("data/agegroup_state.csv"),
    d3.csv("data/roaduser_state.csv")
]).then(function(files) {

    const geoData = files[0];
    const stateData = files[1];
    const ageData = files[2];
    const roadUserData = files[3];
    const sexData = files[4];
    const counterpartyData = files[5];
    const ageStateData = files[6];
    const roadUserStateData = files[7];
    const detailData = {
        stateData: stateData,
        ageData: ageData,
        roadUserData: roadUserData,
        sexData: sexData,
        counterpartyData: counterpartyData
    };
    mapDashboardData = {
        geoData: geoData,
        stateData: stateData,
        ageData: ageData,
        roadUserData: roadUserData,
        sexData: sexData,
        counterpartyData: counterpartyData,
        ageStateData: ageStateData,
        roadUserStateData: roadUserStateData,
        detailData: detailData
    };

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

    ageStateData.forEach(function(d) {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    roadUserStateData.forEach(function(d) {
        d.year = +d.year;
        d.cases = +d["Sum(cases)"];
        d.bed_days = +d["Sum(bed_days)"];
    });

    drawAustraliaMap(geoData, stateData, ageData, roadUserData, sexData, counterpartyData, ageStateData, roadUserStateData, detailData);

    d3.select("#backButton").on("click", function() {
        selectedState = "National";
        selectedRoadUser = null;
        selectedAgeGroup = null;
        drawAustraliaMap(geoData, stateData, ageData, roadUserData, sexData, counterpartyData, ageStateData, roadUserStateData, detailData);
        if (typeof updateAgeDonutChart === "function") {
            updateAgeDonutChart("National", selectedYear);
        }
        if (typeof updateSeverityRadarChart === "function") {
            updateSeverityRadarChart("Australia", selectedYear, null);
        }
    });

}).catch(function(error) {
    console.log("Error loading files");
    console.log(error);
});


function drawAustraliaMap(geoData, stateData, ageData, roadUserData, sexData, counterpartyData, ageStateData, roadUserStateData, detailData) {

    d3.select("#map").html("");
    d3.select("#backButton").style("display", "none");
    resetDetailsPanel(detailData);
    d3.select(".map-panel h2").text("Australia Map, " + getSelectedYearLabel());

    const filteredStateData = getMapStateDataForSelectedYear(stateData);

    const dataByState = {};

    filteredStateData.forEach(function(d) {
        dataByState[d.state] = d;
    });

    const width = 800;
    const height = 600;

    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const projection = d3.geoMercator()
        .fitExtent([[20, 20], [width - 20, height - 20]], geoData);

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
                    "Period: " + getSelectedYearLabel() + "<br>" +
                    "Cases: " + (row ? d3.format(",.0f")(row.cases) : "No data") + "<br>" +
                    "Bed Days: " + (row ? d3.format(",.0f")(row.bed_days) : "No data")
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
                updateAgePieChart(stateName, selectedYear);
            }

            if (typeof updateSeverityRadarChart === "function") {
                updateSeverityRadarChart(stateName, selectedYear, null);
            }

            showDetails(
                stateName,
                stateData,
                ageData,
                roadUserData,
                sexData,
                counterpartyData,
                ageStateData,
                roadUserStateData
            );

            drawStateMap(stateName);
        });
}

function getMapStateDataForSelectedYear(stateData) {
    if (!isAverageYear(selectedYear)) {
        return stateData.filter(function(d) {
            return d.year === selectedYear;
        });
    }

    return Array.from(
        d3.rollup(
            stateData,
            function(rows) {
                const yearCount = d3.union(rows.map(function(d) {
                    return d.year;
                })).size || 1;

                return {
                    state: rows[0].state,
                    year: selectedYear,
                    cases: d3.sum(rows, function(d) {
                        return d.cases;
                    }) / yearCount,
                    bed_days: d3.sum(rows, function(d) {
                        return d.bed_days;
                    }) / yearCount
                };
            },
            function(d) {
                return d.state;
            }
        ),
        function([state, values]) {
            return values;
        }
    );
}

function updateMapForSelectedYear() {
    if (!mapDashboardData) {
        return;
    }

    if (selectedState && selectedState !== "National") {
        d3.select(".map-panel h2").text(selectedState + " Map, " + getSelectedYearLabel());
        showDetails(
            selectedState,
            mapDashboardData.stateData,
            mapDashboardData.ageData,
            mapDashboardData.roadUserData,
            mapDashboardData.sexData,
            mapDashboardData.counterpartyData,
            mapDashboardData.ageStateData,
            mapDashboardData.roadUserStateData
        );
        return;
    }

    drawAustraliaMap(
        mapDashboardData.geoData,
        mapDashboardData.stateData,
        mapDashboardData.ageData,
        mapDashboardData.roadUserData,
        mapDashboardData.sexData,
        mapDashboardData.counterpartyData,
        mapDashboardData.ageStateData,
        mapDashboardData.roadUserStateData,
        mapDashboardData.detailData
    );
}


function drawStateMap(stateName) {

    d3.select("#map").html("");
    d3.select("#backButton").style("display", "block");
    d3.select(".map-panel h2").text(stateName + " Map, " + getSelectedYearLabel());

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
            .attr("height", height)
            .attr("viewBox", "0 0 " + width + " " + height)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const projection = d3.geoMercator()
            .fitExtent([[20, 20], [width - 20, height - 20]], stateMap);

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


function showDetails(stateName, stateData, ageData, roadUserData, sexData, counterpartyData, ageStateData, roadUserStateData) {

    const rows = stateData.filter(function(d) {
        return d.state === stateName && (isAverageYear(selectedYear) || d.year === selectedYear);
    });
    const yearCount = getYearCount(rows);

    const totalCases = d3.sum(rows, function(d) {
        return d.cases;
    }) / yearCount;

    const totalBedDays = d3.sum(rows, function(d) {
        return d.bed_days;
    }) / yearCount;

    const stateCode = getStateCode(stateName);

    const topAge = ageStateData.filter(function(d) {
        return d.state === stateCode && (isAverageYear(selectedYear) || d.year === selectedYear) && d.age_group !== "Missing";
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    const topRoadUser = roadUserStateData.filter(function(d) {
        return d.state === stateCode && (isAverageYear(selectedYear) || d.year === selectedYear);
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    const topSex = sexData.filter(function(d) {
        return isAverageYear(selectedYear) || d.year === selectedYear;
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    const topCounterparty = counterpartyData.filter(function(d) {
        return isAverageYear(selectedYear) || d.year === selectedYear;
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    d3.select("#details").html(
        "<h3>Selected State</h3>" +
        "<div class='summary-grid'>" +
        "<div><span>State</span><strong>" + stateName + "</strong></div>" +
        "<div><span>" + getCasesLabel() + "</span><strong>" + d3.format(",.0f")(totalCases) + "</strong></div>" +
        "<div><span>" + getBedDaysLabel() + "</span><strong>" + d3.format(",.0f")(totalBedDays) + "</strong></div>" +
        "<div><span>Selected period</span><strong>" + getSelectedYearLabel() + "</strong></div>" +
        "<div><span>Most affected age group</span><strong>" + (topAge ? topAge.age_group : "-") + "</strong></div>" +
        "<div><span>Highest road user type</span><strong>" + (topRoadUser ? topRoadUser.road_user_group : "-") + "</strong></div>" +
        "<div><span>Highest gender category</span><strong>" + (topSex ? topSex.sex : "-") + "</strong></div>" +
        "<div><span>Main counterparty</span><strong>" + (topCounterparty ? topCounterparty.counterparty : "-") + "</strong></div>" +
        "</div>"
    );
}

function getStateCode(stateName) {
    if (typeof convertStateName === "function") {
        return convertStateName(stateName);
    }

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

function getYearCount(rows) {
    return isAverageYear(selectedYear) ? (d3.union(rows.map(function(d) {
        return d.year;
    })).size || 1) : 1;
}

function getCasesLabel() {
    return isAverageYear(selectedYear) ? "Average annual cases" : "Cases in " + selectedYear;
}

function getBedDaysLabel() {
    return isAverageYear(selectedYear) ? "Average annual bed days" : "Bed days in " + selectedYear;
}

function resetDetailsPanel(detailData) {
    if (!detailData) {
        return;
    }

    const stateRows = detailData.stateData.filter(function(d) {
        return isAverageYear(selectedYear) || d.year === selectedYear;
    });
    const yearCount = getYearCount(stateRows);

    const totalCases = d3.sum(stateRows, function(d) {
        return d.cases;
    }) / yearCount;

    const totalBedDays = d3.sum(stateRows, function(d) {
        return d.bed_days;
    }) / yearCount;

    const topAge = detailData.ageData.filter(function(d) {
        return (isAverageYear(selectedYear) || d.year === selectedYear) && d.age_group !== "Missing";
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    const topRoadUser = detailData.roadUserData.filter(function(d) {
        return isAverageYear(selectedYear) || d.year === selectedYear;
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    const topSex = detailData.sexData.filter(function(d) {
        return isAverageYear(selectedYear) || d.year === selectedYear;
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    const topCounterparty = detailData.counterpartyData.filter(function(d) {
        return isAverageYear(selectedYear) || d.year === selectedYear;
    }).slice().sort(function(a, b) {
        return b.cases - a.cases;
    })[0];

    d3.select("#details").html(
        "<h3>Selected State</h3>" +
        "<div class='summary-grid'>" +
        "<div><span>State</span><strong>National</strong></div>" +
        "<div><span>" + getCasesLabel() + "</span><strong>" + d3.format(",.0f")(totalCases) + "</strong></div>" +
        "<div><span>" + getBedDaysLabel() + "</span><strong>" + d3.format(",.0f")(totalBedDays) + "</strong></div>" +
        "<div><span>Selected period</span><strong>" + getSelectedYearLabel() + "</strong></div>" +
        "<div><span>Most affected age group</span><strong>" + (topAge ? topAge.age_group : "-") + "</strong></div>" +
        "<div><span>Highest road user type</span><strong>" + (topRoadUser ? topRoadUser.road_user : "-") + "</strong></div>" +
        "<div><span>Highest gender category</span><strong>" + (topSex ? topSex.sex : "-") + "</strong></div>" +
        "<div><span>Main counterparty</span><strong>" + (topCounterparty ? topCounterparty.counterparty : "-") + "</strong></div>" +
        "</div>"
    );
}
