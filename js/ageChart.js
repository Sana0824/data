console.log("ageChart.js loaded");

let ageStateData = [];
let ageDefaultData = [];
let selectedAgeGroup = null;
let selectedState = "National";
let selectedRoadUser = null;
let ageRoadUserData = [];

function getAgeShareText(value, total) {
    if (total === 0) {
        return "0%";
    }

    return (value / total * 100).toFixed(1) + "%";
}

function showAgeTooltip(event, d, total) {
    d3.select("#ageTooltip")
        .style("opacity", 1)
        .html(
            "Age group: " + d.label + "<br>" +
            "Share of total: " + getAgeShareText(d.value, total)
        )
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 24 + "px");
}

function isKnownAgeGroup(ageGroup) {
    return (ageGroup || "").trim().toLowerCase() !== "missing";
}

d3.select("body").on("click.ageReset", function(event) {
    if (event.target.closest("#agePieChart")) {
        return;
    }

    selectedAgeGroup = null;

    d3.selectAll(".age-slice")
        .style("opacity", 1)
        .attr("transform", null)
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    d3.select("#ageTooltip").style("opacity", 0);
    d3.select("#ageInsight").text("Click an age group to see an insight.");
});

// Load default national data
d3.csv("data/default.csv").then(function(data) {

    data.forEach(function(d) {
        d.value = +d["Sum(cases)"];
    });

    ageDefaultData = data;
    ageRoadUserData = data
        .filter(function(d) {
            return isKnownAgeGroup(d.age_group);
        })
        .map(function(d) {
            return {
                state: "National",
                road_user: cleanAgeRoadUserName(d.road_user),
                age_group: d.age_group,
                value: d.value
            };
        });
    drawAgeDonutChart(data, "National");
});

// Load state age data
d3.csv("data/agegroup_state.csv").then(function(data) {

    data.forEach(function(d) {
        d.value = +d["Sum(cases)"];
    });

    ageStateData = data;

    console.log("Age group data loaded:", ageStateData);
});

// This function will be called from map.js
function updateAgeDonutChart(stateName) {

    selectedState = stateName || "National";
    const shortStateName = convertStateName(stateName);

    if (shortStateName === "National") {
        drawAgeDonutChart(ageDefaultData, "National");
        return;
    }

    const selectedData = ageStateData.filter(function(d) {
        return d.state.trim() === shortStateName.trim();
    });

    console.log("Selected age data for " + stateName + ":", selectedData);

    drawAgeDonutChart(selectedData, stateName);
}

// This keeps old map.js function call working
function updateAgePieChart(stateName) {
    updateAgeDonutChart(stateName);
}

function updateAgeChartByRoadUser(stateName, roadUserName) {
    selectedState = stateName || "National";
    selectedRoadUser = roadUserName || null;

    if (!selectedRoadUser) {
        updateAgeDonutChart(selectedState);
        return;
    }

    if (ageRoadUserData.length === 0) {
        updateAgeDonutChart(selectedState);
        d3.select("#agePieTitle").text("Age Group Injury Cases - " + selectedState);
        console.log("No dataset contains state, road_user, age_group, cases, and bed_days together. Showing normal age chart.");
        return;
    }

    const shortStateName = convertStateName(selectedState);
    const hasStateRoadUserAgeData = ageRoadUserData.some(function(d) {
        return d.state === shortStateName && d.road_user === selectedRoadUser;
    });

    const selectedData = ageRoadUserData.filter(function(d) {
        if (hasStateRoadUserAgeData) {
            return d.state === shortStateName && d.road_user === selectedRoadUser;
        }

        return d.state === "National" && d.road_user === selectedRoadUser;
    });

    const groupedData = Array.from(
        d3.rollup(
            selectedData,
            function(v) {
                return d3.sum(v, function(d) {
                    return d.value;
                });
            },
            function(d) {
                return d.age_group;
            }
        ),
        function([ageGroup, value]) {
            return {
                age_group: ageGroup,
                value: value
            };
        }
    );

    groupedData.sort(function(a, b) {
        return b.value - a.value;
    });

    if (shortStateName === "National" || hasStateRoadUserAgeData) {
        drawAgeDonutChart(groupedData, "Age Groups for " + selectedRoadUser + " Injuries - " + selectedState);
        highlightAgeSlice(groupedData[0] ? groupedData[0].age_group : null, selectedRoadUser);
        return;
    }

    updateAgeDonutChart(selectedState);
    highlightAgeSlice(groupedData[0] ? groupedData[0].age_group : null, selectedRoadUser);
}

function cleanAgeRoadUserName(label) {
    const text = (label || "").trim().toLowerCase();

    if (text === "car driver" || text === "driver") {
        return "Driver";
    }

    if (text === "car passenger" || text === "passenger") {
        return "Passenger";
    }

    if (
        text === "car unknown position" ||
        text === "car driver, passenger or unknown position" ||
        text === "heavy transport driver" ||
        text === "heavy transport passenger" ||
        text === "heavy transport unknown position" ||
        text === "driver/passenger"
    ) {
        return "Driver/passenger";
    }

    if (text === "motorcyclist") {
        return "Motorcyclist";
    }

    if (text === "pedal cyclist") {
        return "Pedal cyclist";
    }

    if (text === "pedestrian") {
        return "Pedestrian";
    }

    return "Other/unknown";
}

function highlightAgeSlice(ageGroupLabel, roadUserName) {
    if (!ageGroupLabel) {
        return;
    }

    selectedAgeGroup = ageGroupLabel;

    d3.selectAll(".age-slice")
        .style("opacity", function(d) {
            return d.data.label === ageGroupLabel ? 1 : 0.35;
        })
        .attr("stroke", function(d) {
            return d.data.label === ageGroupLabel ? "#111827" : "none";
        })
        .attr("stroke-width", function(d) {
            return d.data.label === ageGroupLabel ? 3 : 0;
        });

    d3.select("#ageInsight")
        .text("Highlighted age group for " + roadUserName + ": " + ageGroupLabel + ".");
}

// Convert full state names from map into short names used in CSV
function convertStateName(stateName) {

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

// Reusable age donut chart function
function drawAgeDonutChart(data, titleText) {

    d3.select("#agePieChart").html("");
    const title = titleText.indexOf("Age Groups for ") === 0 ? titleText : "Age Group Injury Cases - " + titleText;
    d3.select("#agePieTitle").text(title);
    d3.select("#ageInsight").text("Click an age group to see an insight.");
    selectedAgeGroup = null;
    d3.select("#ageTooltip").style("opacity", 0);

    if (data.length === 0) {
        d3.select("#agePieChart")
            .append("p")
            .text("No age group data available for " + titleText);
        return;
    }

    const knownAgeData = data.filter(function(d) {
        return isKnownAgeGroup(d.age_group);
    });

    if (knownAgeData.length === 0) {
        d3.select("#agePieChart")
            .append("p")
            .text("No age group data available for " + titleText);
        return;
    }

    const ageGroupedData = Array.from(
        d3.rollup(
            knownAgeData,
            function(v) {
                return d3.sum(v, function(d) {
                    return d.value;
                });
            },
            function(d) {
                return d.age_group;
            }
        ),
        function([label, value]) {
            return {
                label: label,
                value: value
            };
        }
    );

    ageGroupedData.sort(function(a, b) {
        return b.value - a.value;
    });

    console.log("Age grouped data:", ageGroupedData);

    const width = 360;
    const height = 260;
    const radius = 104;

    const svg = d3.select("#agePieChart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height);

    const chartGroup = svg.append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    const pie = d3.pie()
        .sort(null)
        .value(function(d) {
            return d.value;
        });

    const arc = d3.arc()
        .innerRadius(68)
        .outerRadius(radius);

    const hoverArc = d3.arc()
        .innerRadius(68)
        .outerRadius(radius + 8);

    const color = d3.scaleOrdinal(d3.schemeTableau10);
    const pieData = pie(ageGroupedData);
    const totalCases = d3.sum(ageGroupedData, function(d) {
        return d.value;
    });

    chartGroup.selectAll("path")
        .data(pieData)
        .enter()
        .append("path")
        .attr("class", "age-slice")
        .attr("d", arc)
        .attr("fill", function(d) {
            return color(d.data.label);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("mouseover", function(event, d) {

        d3.select(this)
            .attr("d", hoverArc)
            .style("opacity", function(d) {
                if (selectedAgeGroup === null) {
                    return 0.9;
                }

                return selectedAgeGroup === d.data.label ? 1 : 0.4;
            });

        showAgeTooltip(event, d.data, totalCases);
    })
    .on("mousemove", function(event) {

        d3.select("#ageTooltip")
            .style("left", event.pageX + 12 + "px")
            .style("top", event.pageY - 24 + "px");
    })
    .on("mouseout", function(event, d) {

        d3.select(this)
            .attr("d", arc)
            .style("opacity", function(d) {
                return selectedAgeGroup === null || selectedAgeGroup === d.data.label ? 1 : 0.4;
            });

        if (selectedAgeGroup === null) {
            d3.select("#ageTooltip").style("opacity", 0);
        }
    })
    .on("click", function(event, d) {
        event.stopPropagation();

        selectedAgeGroup = d.data.label;

        const percentageText = getAgeShareText(d.data.value, totalCases);

        chartGroup.selectAll(".age-slice")
            .style("opacity", 0.45)
            .attr("d", arc)
            .attr("stroke", "none")
            .attr("stroke-width", 0);

        d3.select(this)
            .style("opacity", 1)
            .attr("d", hoverArc)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 3);

        d3.select("#ageInsight")
            .text("People aged " + d.data.label + " represent " + percentageText +
                " of hospitalised road crash injuries in " + titleText + ".");

        if (typeof updateSeverityRadarChart === "function") {
            updateSeverityRadarChart(selectedState, selectedAgeGroup);
        }

        showAgeTooltip(event, d.data, totalCases);

    });

    chartGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -5)
    .style("font-size", "13px")
    .style("font-weight", "bold")
    .text("Total");

    chartGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 15)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text(d3.format(",")(totalCases));

    const legend = d3.select("#agePieChart")
        .append("div")
        .attr("class", "age-legend");

    legend.selectAll("div")
        .data(ageGroupedData)
        .enter()
        .append("div")
        .attr("class", "legend-item")
        .html(function(d) {
            return "<span style='background:" + color(d.label) + "'></span>" + d.label;
        });

}


