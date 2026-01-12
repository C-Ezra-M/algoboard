import { parse } from "csv/browser/esm/sync";
import { enumerate } from "pythonic";
import "blissfuljs/bliss.shy";
const $ = Bliss;

const defaultConfig = {
    bgColor: "black",
    rankBgColor: "gray",
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
    beforeIncreaseTime: "2s",
    increaseTime: "1.5s",
    afterIncreaseTime: "0.5s",
    rankAdjustmentTime: "1.5s",
    afterRankAdjustmentTime: "0.5s",
    scoreInterpRate: 30,
    autoEliminate: true,
    eliminatedAfter: 1,
}
let config = defaultConfig;
let entries = {};

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

function pointScale(entryList) {
    return pxToNum(config.maxBarWidth) / entryList.toSorted((a, b) => b.scoreAfter - a.scoreAfter)
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
        ...Object.fromEntries(parseResult.filter(e => e[0].startsWith("\\")).map(e => [e[0].replace(/^\\/, ""), e[1]]))
    }
    entries = parseResult.filter(e => !e[0].startsWith("\\")).map(e => ({
        name: e[0],
        color: e[1],
        scoreBefore: parseInt(e[2]),
        scoreAfter: parseInt(e[3]),
        eliminatedBefore: e[4] ?? false,
        eliminatedAfter: e[5] ?? false,
    }))
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
}

async function fileImportEvent() {
    parseConfig(await this.files[0].text())
    console.log(config)
    console.log(entries)
}

function animateScoreboard() {

}

function animateBar(entry) {

}

$("#importFile").addEventListener("input", fileImportEvent)
$("#animate").addEventListener("input", animateScoreboard)
