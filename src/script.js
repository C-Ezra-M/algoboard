import { parse } from "csv/browser/esm/sync";
import { enumerate } from "pythonic";
import { animate, utils } from "animejs";
import "blissfuljs/bliss.shy";
const $ = Bliss;

function getTypeConverter(v) {
    switch (typeof v) {
        case 'number': return Number
        case 'bigint': return BigInt
        case 'boolean': return JSON.parse
        default: return (v) => v
    }
}

const defaultConfig = {
    background: "black",
    rankBackground: "gray",
    eliminatedColor: "red",
    font: "40px Verdana",
    eliminatedFont: "bold italic 40px Verdana",
    boardHeight: "720px",
    boardWidth: "1280px",
    barHeight: "50px",
    rankWidth: "100px",
    rankPadding: "10px",
    boardPadding: "10px",
    maxBarWidth: "900px",
    barGap: "5px",
    lang: "en", // right now only affects the formatting of scores
    beforeIncreaseTime: 2000,
    increaseTime: 2500,
    afterIncreaseTime: 0,
    rankAdjustmentTime: 2500,
    afterRankAdjustmentTime: 1000,
    autoEliminate: true,
    eliminatedBefore: -1,
    // optional, the default of -1 means "eliminate 1 person only", so does any negative or indefinite (NaN, Infinity, etc.)
    eliminatedAfter: 1,
}
let config = defaultConfig;
let entries = [];
let pointScale = 1;

function formatNum(n) {
    return new Intl.NumberFormat(config.lang).format(n)
}

function lerp(a, b, alpha) {
    return (1 - alpha) * a + alpha * b
}

function ordinal(n) {
    let det = parseInt(n.toString().slice(-2));
    if (
        det % 10 <= 3
        && det % 10 !== 0
        && det < 10
        || det > 20
    ) {
        if (det % 10 === 1) return n + "st";
        if (det % 10 === 2) return n + "nd";
        return n + "rd";
    }
    return n + "th";
}

function pxToNum(px) {
    return parseInt(px.replace(/px$/, ""))
}

function calcPointScale(entryList) {
    return pxToNum(config.maxBarWidth) / Math.max(...entryList.map(e => e.scoreAfter))
}

function parseConfig(contents) {
    const parseResult = parse(contents, {
        delimiter: ";",
        skip_empty_lines: true,
        comment: "#",
        comment_no_infix: true,
        relax_column_count: true,
        relax_quotes: true,
    })
    config = {
        ...defaultConfig,
        ...config,
        ...Object.fromEntries(
            parseResult.filter(e => e[0].startsWith("\\"))
                .map(e => [e[0].replace(/^\\/, ""), e[1]]) // remove backslashes
                .map(e => [e[0], getTypeConverter(defaultConfig[e[0]])(e[1])]) // applies schema based on default config
        )
    }
    entries = parseResult.filter(e => !e[0].startsWith("\\")).map(e => {
        const obj = {
            name: e[0],
            color: e[1],
            scoreBefore: parseInt(e[2]),
            scoreAfter: parseInt(e[3]),
            // status won't be modified, but visibleStatus can be
            status: e[4], // safe, eliminated, newEliminated, rejoining
            visibleStatus: e[4],
            resetAnimationScore() {
                this.animationScore = this.scoreBefore;
            },
            tryEliminate() {
                if (this.visibleStatus === "newEliminated") {
                    this.visibleStatus = "eliminated"
                }
                if (this.visibleStatus === "rejoining") {
                    this.visibleStatus = "safe"
                }
            },
            resetStatus() {
                this.visibleStatus = this.status
            }
        }
        obj.resetAnimationScore()
        return obj
    }).toSorted((a, b) => b.scoreBefore - a.scoreBefore)
    formScoreboard(entries)
}

function formScoreboard(entryList) {
    entryList = entryList.toSorted((a, b) => b.scoreBefore - a.scoreBefore)
    $("#bars").innerText = "";
    $("#ranks").innerText = "";
    for (let [n, i] of enumerate(entryList)) {
        $("#ranks").appendChild($.create("div", {
            contents: ordinal(n + 1),
            className: "rank",
        }))
        $("#bars").appendChild($.create("div", {
            "data-name": i.name,
            className: "bar",
            contents: [
                $.create("div", {
                    className: "bar-inner",
                    style: {
                        backgroundColor: i.color,
                    },
                    contents: $.create("div", {
                        className: "points",
                        contents: formatNum(i.scoreBefore),
                    })
                }),
                $.create("div", {
                    className: "name",
                    style: {
                        color: i.color,
                    },
                    contents: i.name,
                })
            ]
        }))
    }
    pointScale = calcPointScale(entries)
}

async function fileImportEvent() {
    parseConfig(await this.files[0].text())
    console.log(config)
    console.log(entries)
}

function animateScoreboard() {
    for (let i of entries) {
        animateBar(i)
    }
}

async function animateBar(entry) {
    const bar = $(`#bars [data-name="${CSS.escape(entry.name)}"]`)
    // I have to use the Web Animations API for the bar because animating it
    // with animejs would reduce the bar (sometimes to zero) after the animation,
    // which is annoying.
    $(".bar-inner", bar).animate(
        {
            width: [
                pointScale * entry.scoreBefore + "px",
                pointScale * entry.scoreAfter + "px",
            ],
        }, {
            duration: 2500,
            fill: "forwards",
        }
    )
    animate(entry, {
        animationScore: entry.scoreAfter,
        modifier: formatNum,
        duration: config.increaseTime,
        ease: 'linear',
        onUpdate: () => {
            $(".points", bar).innerText = utils.round(0)(entry.animationScore)
        },
        onComplete: () => entry.resetAnimationScore(),
    })
}

$("#importFile").addEventListener("input", fileImportEvent)
$("#animate").addEventListener("click", animateScoreboard)
