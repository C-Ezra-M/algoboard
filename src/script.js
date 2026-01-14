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
    rankText: "white",
    eliminatedColor: "red",
    rejoiningColor: "lime",
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
            initialStatus: e[4],
            status: e[4], // safe, eliminated, newEliminated, rejoining
            resetAnimationScore() {
                this.animationScore = this.scoreBefore;
            },
            statusAfter() {
                if (this.status === "newEliminated") {
                    return "eliminated"
                }
                if (this.status === "rejoining") {
                    return "safe"
                }
                return this.status
            },
        }
        obj.resetAnimationScore()
        return obj
    }).toSorted((a, b) => b.scoreBefore - a.scoreBefore)
    autoEliminate(entries)
    formScoreboard(entries)
}

function formScoreboard(entryList) {
    entryList = entryList.toSorted((a, b) => b.scoreBefore - a.scoreBefore)
    $("#bars").innerText = "";
    $("#ranks").innerText = "";
    pointScale = calcPointScale(entries)
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
                        width: i.scoreBefore * pointScale + "px",
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
                }),
                $.create("div", {
                    className: "eliminated tag",
                    contents: "ELIMINATED",
                }),
                $.create("div", {
                    className: "rejoining tag",
                    contents: "REJOINING",
                }),
            ]
        }))
    }
    if (config.autoEliminate) {
        autoEliminate()
    }
    showElimination(entries, true)
}

async function sleep(t) {
    return new Promise((resolve, reject) => setTimeout(resolve, t))
}

async function fileImportEvent() {
    parseConfig(await this.files[0].text())
    console.log(config)
    console.log(entries)
}

function autoEliminate(entries) {
    // TODO
}

function showElimination(entryList, beforeElimination) {
    for (let i of entryList) {
        const bar = getBarFromEntry(i);
        const eliminatedTag = $(".eliminated", bar)
        const rejoiningTag = $(".rejoining", bar)
        if (
            i.status === "safe"
            || i.status === "newEliminated" && beforeElimination
        ) {
            eliminatedTag.classList.remove("show")
            rejoiningTag.classList.remove("show")
        }
        if (
            i.status === "eliminated"
            || i.status === "newEliminated" && !beforeElimination
        ) {
            eliminatedTag.classList.add("show")
            rejoiningTag.classList.remove("show")
        }
        if (i.status === "rejoining") {
            eliminatedTag.classList.remove("show")
            rejoiningTag.classList.add("show")
        }
    }
}

async function animateScoreboard() {
    // Reset scoreboard
    for (let i of entries) {
        getBarFromEntry(i).style.transform = ""
        $(".bar-inner", getBarFromEntry(i)).style.width = pointScale * i.scoreBefore + "px"
        $(".points", getBarFromEntry(i)).innerText = i.scoreBefore
    }
    await sleep(config.beforeIncreaseTime)
    for (let i of entries) {
        animateBar(i)
    }
    await sleep(config.increaseTime + config.afterIncreaseTime)
    const sortedEntryList = entries.toSorted((a, b) => b.scoreAfter - a.scoreAfter)
    for (let [n, i] of enumerate(sortedEntryList)) {
        moveBar(i, entries.indexOf(i), n)
    }
    await sleep(config.rankAdjustmentTime + config.afterRankAdjustmentTime)
    showElimination(entries, false)
}

function getBarFromEntry(entry) {
    return getBarFromName(entry.name)
}

function getBarFromName(name) {
    return $(`#bars [data-name="${CSS.escape(name)}"]`)
}

async function animateBar(entry) {
    const bar = getBarFromEntry(entry)
    // I have to use the Web Animations API for the bar because animating it
    // with animejs would reduce the bar (sometimes to zero) after the animation,
    // which is annoying.
    const barIncreaseAnimation = $(".bar-inner", bar).animate(
        {
            width: [
                pointScale * entry.scoreBefore + "px",
                pointScale * entry.scoreAfter + "px",
            ],
        }, {
            duration: config.increaseTime,
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
    await barIncreaseAnimation.finished;
    barIncreaseAnimation.commitStyles();
    barIncreaseAnimation.cancel();
}

function moveBar(entry, initialPos, finalPos) {
    const bar = getBarFromEntry(entry)
    animate(bar, {
        translateY: (finalPos - initialPos) * (pxToNum(config.barHeight) + pxToNum(config.barGap)),
        duration: config.rankAdjustmentTime,
        ease: 'inOut',
    })
}

$("#importFile").addEventListener("input", fileImportEvent)
$("#animate").addEventListener("click", animateScoreboard)
