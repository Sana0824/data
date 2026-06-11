console.log("severity radar chart loaded");

let severityNationalData = [];
let severityStateData = [];
let severityChartReady = false;
let severitySvg = null;
let severityPlot = null;
let severityShape = null;
let severityPointLayer = null;
let selectedRegion = "Australia";

const severityMetrics = [
    { key: "cases", label: "Cases" },
    { key: "bedDays", label: "Bed days" },
    { key: "bedDaysPerCase", label: "Avg stay" }
];

const severityConfig = {
    width: 520,
    height: 430,
    radius: 138,
    levels: 4
};

function isKnownSeverityAgeGroup(ageGroup) {
    return (ageGroup || "").trim().toLowerCase() !== "missing";
}

Promise.all([
    d3.csv("data/default.csv"),
    d3.csv("data/agegroup_state.csv")
]).then(function(files) {
    severityNationalData = files[0]
        .filter(function(d) {
            return isKnownSeverityAgeGroup(d.age_group);
        })
        .map(function(d) {
            const cases = +d["Sum(cases)"];
            const meanBedDays = +d["Mean(bed_days)"];

            return {
                region: "Australia",
                year: +d.year,
                ageGroup: d.age_group,
                cases: cases,
                bedDays: cases * meanBedDays
            };
        });

    severityStateData = files[1]
        .filter(function(d) {
            return isKnownSeverityAgeGroup(d.age_group);
        })
        .map(function(d) {
            return {
                region: d.state,
                year: +d.year,
                ageGroup: d.age_group,
                cases: +d["Sum(cases)"],
                bedDays: +d["Sum(bed_days)"]
            };
        });

    updateSeverityRadarChart("Australia", selectedYear, null);
}).catch(function(error) {
    console.log("Error loading severity radar data");
    console.log(error);
});

function updateSeverityRadarChart(regionName, year, ageGroupName) {
    const region = normaliseSeverityRegion(regionName);
    selectedRegion = region;
    if (ageGroupName === undefined && typeof year === "string" && !isAverageYear(year)) {
        ageGroupName = year;
        year = selectedYear;
    }
    selectedYear = year || selectedYear;
    selectedAgeGroup = ageGroupName || null;

    if (!severityChartReady) {
        initialiseSeverityRadarChart();
    }

    const rows = getSeverityRows(region, selectedYear);
    const summary = getSeveritySummary(rows, selectedAgeGroup);
    const maxValues = getSeverityMaxValuesFromRowSets([rows]);
    const chartData = buildSeverityRadarData(summary, maxValues);

    d3.select("#roadUserBarTitle")
        .text(selectedAgeGroup ? "Severity Pattern for " + selectedAgeGroup + ", " + getSelectedYearLabel() + " - " + region : "Severity Pattern, " + getSelectedYearLabel() + " - " + region);

    drawSeverityRadar(chartData, summary.ageGroup, region);
}

// Compatibility for the existing map call.
function updateRoadUserBubbleChart(stateName) {
    updateSeverityRadarChart(stateName || "Australia", selectedYear, selectedAgeGroup);
}

function updateRoadUserBarChart(stateName) {
    updateSeverityRadarChart(stateName || "Australia", selectedYear, selectedAgeGroup);
}

function updateRoadUserPieChart(stateName) {
    updateSeverityRadarChart(stateName || "Australia", selectedYear, selectedAgeGroup);
}

function updateRoadUserDonutChart(stateName) {
    updateSeverityRadarChart(stateName || "Australia", selectedYear, selectedAgeGroup);
}

function normaliseSeverityRegion(regionName) {
    const stateMap = {
        "Australian Capital Territory": "ACT",
        "New South Wales": "NSW",
        "Northern Territory": "NT",
        "Queensland": "Qld",
        "South Australia": "SA",
        "Tasmania": "Tas",
        "Victoria": "Vic",
        "Western Australia": "WA",
        "National": "Australia"
    };

    return stateMap[regionName] || regionName || "Australia";
}

function getSeverityRows(region, year) {
    if (region === "Australia") {
        if (isAverageYear(year)) {
            return severityNationalData;
        }

        return severityNationalData.filter(function(d) {
            return d.year === year;
        });
    }

    if (isAverageYear(year)) {
        return severityStateData.filter(function(d) {
            return d.region === region;
        });
    }

    return severityStateData.filter(function(d) {
        return d.region === region && d.year === year;
    });
}

function getSeveritySummary(rows, ageGroupName) {
    const selectedRows = ageGroupName ? rows.filter(function(d) {
        return d.ageGroup === ageGroupName;
    }) : rows;

    const cases = d3.sum(selectedRows, function(d) {
        return d.cases;
    });
    const bedDays = d3.sum(selectedRows, function(d) {
        return d.bedDays;
    });
    const yearCount = isAverageYear(selectedYear) ? (d3.union(selectedRows.map(function(d) {
        return d.year;
    })).size || 1) : 1;

    return {
        ageGroup: ageGroupName || "All age groups",
        cases: cases / yearCount,
        bedDays: bedDays / yearCount,
        bedDaysPerCase: cases === 0 ? 0 : bedDays / cases
    };
}

function getSeverityMaxValues(rows) {
    return getSeverityMaxValuesFromRowSets([rows]);
}

function getSeverityMaxValuesFromRowSets(rowSets) {
    const summaries = [];

    rowSets.forEach(function(rows) {
        const grouped = Array.from(
            d3.rollup(
                rows,
                function(v) {
                    const cases = d3.sum(v, function(d) {
                        return d.cases;
                    });
                    const bedDays = d3.sum(v, function(d) {
                        return d.bedDays;
                    });
                    const yearCount = isAverageYear(selectedYear) ? (d3.union(v.map(function(d) {
                        return d.year;
                    })).size || 1) : 1;

                    return {
                        cases: cases / yearCount,
                        bedDays: bedDays / yearCount,
                        bedDaysPerCase: cases === 0 ? 0 : bedDays / cases
                    };
                },
                function(d) {
                    return d.ageGroup;
                }
            ),
            function([ageGroup, values]) {
                values.ageGroup = ageGroup;
                return values;
            }
        );

        summaries.push.apply(summaries, grouped);
        summaries.push(getSeveritySummary(rows, null));
    });

    return {
        cases: d3.max(summaries, function(d) { return d.cases; }) || 1,
        bedDays: d3.max(summaries, function(d) { return d.bedDays; }) || 1,
        bedDaysPerCase: d3.max(summaries, function(d) { return d.bedDaysPerCase; }) || 1
    };
}

function buildSeverityRadarData(summary, maxValues) {
    return severityMetrics.map(function(metric, index) {
        const rawValue = summary[metric.key] || 0;
        const maxValue = maxValues[metric.key] || 1;

        return {
            key: metric.key,
            label: metric.label,
            value: rawValue,
            normalised: Math.max(0, Math.min(1, rawValue / maxValue)),
            angle: Math.PI * 2 / severityMetrics.length * index - Math.PI / 2
        };
    });
}

function initialiseSeverityRadarChart() {
    d3.select("#roadUserBarChart").html("");

    severitySvg = d3.select("#roadUserBarChart")
        .append("svg")
        .attr("viewBox", "0 0 " + severityConfig.width + " " + severityConfig.height)
        .attr("preserveAspectRatio", "xMidYMid meet");

    severityPlot = severitySvg.append("g")
        .attr("transform", "translate(" + severityConfig.width / 2 + "," + (severityConfig.height / 2 + 4) + ")");

    for (let level = 1; level <= severityConfig.levels; level++) {
        severityPlot.append("circle")
            .attr("class", "radar-grid")
            .attr("r", severityConfig.radius / severityConfig.levels * level);
    }

    severityMetrics.forEach(function(metric, index) {
        const angle = Math.PI * 2 / severityMetrics.length * index - Math.PI / 2;
        const end = getRadarPoint(angle, severityConfig.radius);
        const label = getRadarPoint(angle, severityConfig.radius + 28);

        severityPlot.append("line")
            .attr("class", "radar-axis")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", end[0])
            .attr("y2", end[1]);

        severityPlot.append("text")
            .attr("class", "radar-axis-label")
            .attr("x", label[0])
            .attr("y", label[1])
            .attr("text-anchor", Math.abs(label[0]) < 2 ? "middle" : label[0] > 0 ? "start" : "end")
            .attr("dominant-baseline", "middle")
            .text(metric.label);
    });

    severityShape = severityPlot.append("path")
        .attr("class", "radar-shape");

    severityPointLayer = severityPlot.append("g")
        .attr("class", "radar-points");

    d3.select("#resetSeverityRadar").on("click", function() {
        selectedState = "National";
        selectedAgeGroup = null;
        selectedRegion = "Australia";

        if (typeof updateAgeDonutChart === "function") {
            updateAgeDonutChart("National", selectedYear);
        }

        updateSeverityRadarChart("Australia", selectedYear, null);

        d3.selectAll("#map path")
            .attr("stroke", "#666")
            .attr("stroke-width", 1);
    });

    severityChartReady = true;
}

function drawSeverityRadar(chartData, ageGroupName, region) {
    const line = d3.line()
        .x(function(d) {
            return getRadarPoint(d.angle, d.normalised * severityConfig.radius)[0];
        })
        .y(function(d) {
            return getRadarPoint(d.angle, d.normalised * severityConfig.radius)[1];
        })
        .curve(d3.curveLinearClosed);

    severityShape.datum(chartData)
        .transition()
        .duration(750)
        .attr("d", line);

    const points = severityPointLayer.selectAll(".radar-point")
        .data(chartData, function(d) {
            return d.key;
        });

    points.enter()
        .append("circle")
        .attr("class", "radar-point")
        .attr("r", 4)
        .attr("cx", 0)
        .attr("cy", 0)
        .merge(points)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 6);
            d3.select("#roadUserBarTooltip")
                .style("opacity", 1)
                .html(
                    "Metric: " + d.label + "<br>" +
                    "Region: " + region + "<br>" +
                    "Age group: " + ageGroupName + "<br>" +
                    "Value: " + formatSeverityValue(d.key, d.value)
                )
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 24 + "px");
        })
        .on("mousemove", function(event) {
            d3.select("#roadUserBarTooltip")
                .style("left", event.pageX + 12 + "px")
                .style("top", event.pageY - 24 + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 4);
            d3.select("#roadUserBarTooltip").style("opacity", 0);
        })
        .transition()
        .duration(750)
        .attr("cx", function(d) {
            return getRadarPoint(d.angle, d.normalised * severityConfig.radius)[0];
        })
        .attr("cy", function(d) {
            return getRadarPoint(d.angle, d.normalised * severityConfig.radius)[1];
        });

    points.exit().remove();
}

function getRadarPoint(angle, radius) {
    return [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
    ];
}

function formatSeverityValue(metricKey, value) {
    if (metricKey === "bedDaysPerCase") {
        return value.toFixed(1) + " days per case";
    }

    return d3.format(",.0f")(value);
}
