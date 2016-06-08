"use strict";

var moment = require('moment')

// !! Parameter note: All dates need to be in a form that moment can recognize (ie `moment(<date>)` gives a correct date object)

// Calculates a normalized list giving the value of the equity-variables for a person over the dates they've been working
// *nixed* N - An object where each key is a date, and each value is the value of the Need value of the company changed to on that date.
// person - an object where the key is a date, and the value is an object describing a change in equity variables for that date.
    // The key <date> needs to be in a form that moment can recognize (ie `moment(<date>)` gives a correct date object)
    // The value is an object with the properties:
        // S - Salary equivalent changed to on that date.
        // W - Work-rate (percentage of full-time) changed to on that date.
        // D - A number of dollars invested on that date.
        // note - Adds a text note about the change.
// fromDate - the date equity started accruing
// toDate - the date to calculate through (inclusive)
// returns a list of objects defining the equity-variables in various date ranges. Each object has the properties:
    // from - The date, as a unix timestamp, of the beginning of the range (inclusive)
    // to - The date, as a unix timestamp, of the end of the date range (exclusive)
    // S - Salary equivalent
    // W - Work-rate (percentage of full-time)
    // *nixed* N - A 2-element array where the first element is where N starts in the date range, and the second element is where N ends in that date range
    // D - Dollars invested on the 'from' date
exports.normalizePersonalEquity = function(person, fromDate_, toDate_) {
    var toDate = moment(toDate_)
//    var fromDate = moment(fromDate_)

    var normalizedPerson = personToArray(person, toDate)
    //console.log(JSON.stringify(normalizedPerson))
    //var NArray = NToArray(N, fromDate, toDate)

//    var curIndex = 0
//    for(var n=0; n<NArray.length; n++) {
//        var NData = NArray[n]
//
//        while(curIndex < normalizedPerson.length) {
//            var curPerson = normalizedPerson[curIndex]
//
//            //console.log(NData.from.format('YYYY-MM-DD')+' - '+NData.to.format('YYYY-MM-DD')+'  '+curPerson.from.format('YYYY-MM-DD')+' - '+normalizedPerson[curIndex].to.format('YYYY-MM-DD'))
//            // N range is before person range
//            if( ! NData.to.isAfter(curPerson.from)) {
//                break; // do nothing, continue on with the next N change
//
//            // N range covers at least part of person range
//            } else if(!NData.from.isAfter(curPerson.from)) {
//                // N range covers all of person range
//                if(!NData.to.isBefore(curPerson.to)) {
//                    if(n+1 < NArray.length) {
//                        var nextNData = NArray[n+1]
//                    } else {
//                        var nextNData = NData
//                    }
//
//                    curPerson.N = calculateNRange(NData.from, NData.to, NData.N, nextNData.N, curPerson.from, curPerson.to)
//
//                    curIndex++
//                    continue; // there's more for this N to do
//
//                // N range covers part of person range
//                } else {
//                    var newEntry = copy(curPerson)
//                    newEntry.D = 0 // don't duplicate the investment counted
//                    newEntry.C = 0 // don't duplicate the contracted investment
//                    normalizedPerson.splice(curIndex+1,0,newEntry)
//                    curPerson.to = normalizedPerson[curIndex+1].from = NData.to
//                    curPerson.N = calculateNRange(NData.from, NData.to, NData.N, NArray[n+1].N, curPerson.from, curPerson.to)
//                    curIndex++
//                    break;
//                }
//            } else {
//                throw new Error("unexpected: "+JSON.stringify(NData)+" - "+curPerson.from+' '+JSON.stringify(person))
//            }
//        }
//    }

    for(var n=0; n<normalizedPerson.length; n++) {
        var dateInfo = normalizedPerson[n]

        dateInfo.from = dateInfo.from.format('YYYY-MM-DD')
        dateInfo.to = dateInfo.to.format('YYYY-MM-DD')
    }

    return normalizedPerson
}


// returns a object containing normalized total equity data in the same form as normalizePersonalEquity
    // note that W values are summed, and Salary equivalent is averaged (mean)
// normalizedPeople - A list of normalized personal equity objects (as returned from normalizePersonalEquity)
exports.total = function(normalizedPeople) {
    var result = []
    normalizedPeople.forEach(function(person, n) {
        if(n===0) result = person
        else result = mergePeople(result, person)
    })
    return result
}


// An algorithm that transforms a normalized equity object (as returned from normalizePersonalEquity) to use to ramp up the new member's
    // rate of earning equity over time.
// This algorithm starts at `startFraction` of base-equity and bumps up by `bump` every `milestoneDays` days until reaching 100%
// `startFraction` and `bump` are numbers between 0 and 1
exports.newMemberTransform = function(normalizedPerson, startFraction, bump, milestoneDays) {
    var currentFraction = startFraction
    var fractionIncreasePerMilestone = bump
    var nextMilestone = milestoneDays
    var totalManDays = 0
    for(var n=0; n<normalizedPerson.length; n++) {
        // totalManDays + manDays*fraction = nextMilestone
        var dateItem = normalizedPerson[n]

        var days = subtractMoments(moment(dateItem.to), moment(dateItem.from))
        var manDays = days * dateItem.W

        if(manDays + totalManDays > nextMilestone) {  // next milestone is hit in the middle of this item
            var daysTilNextMilestone = nextMilestone - totalManDays
            var newDate = moment(dateItem.from).add(daysTilNextMilestone, 'days')

            var originalFrom = moment(dateItem.from)
            var originalTo = moment(dateItem.to)

            var newItem = copy(dateItem)
//            dateItem.N = splitNRange(dateItem.N, originalFrom,originalTo, originalFrom,newDate)
//            newItem.N = splitNRange(newItem.N, originalFrom,originalTo, newDate,originalTo)
            dateItem.to = newItem.from = newDate.format('YYYY-MM-DD')
            dateItem.S = Math.round(dateItem.S * currentFraction)
            if(dateItem.D !== undefined)
                newItem.D = 0
            if(dateItem.C !== undefined)
                newItem.C = 0

            normalizedPerson.splice(n+1, 0, newItem)

            currentFraction += fractionIncreasePerMilestone

            totalManDays = nextMilestone
            if(currentFraction >= 1) {
                break;
            } else {
                nextMilestone += milestoneDays
            }
        } else if(n+1 === normalizedPerson.length || manDays + totalManDays === nextMilestone) { // this item exactly hits the milestone (or is the last item)
            dateItem.S = Math.round(dateItem.S * currentFraction)
            currentFraction += fractionIncreasePerMilestone

            totalManDays = nextMilestone
            if(currentFraction >= 1) {
                break;
            } else {
                nextMilestone += milestoneDays
            }

        } else {      // next milestone isn't hit in this item
            dateItem.S = Math.round(dateItem.S * currentFraction)
            totalManDays+= manDays
        }
    }

    // continue building

    return normalizedPerson
}


// return the number of shares earned/created over a period of time
// normalizedEquity - A list of normalized personal equity objects (as returned from normalizePersonalEquity)
// Narray - An array of the same form as the result of NToArray
// from - the date which to start summing from (inclusive)
// to - the date which to sum to (exclusive)
exports.sumShares = function(normalizedEquity, Narray, _from, _to) {
    var from = moment(_from)
    var to = moment(_to)

    var totalShares = 0
    for(var n=0; n<normalizedEquity.length; n++) {
        var item = normalizedEquity[n]
        var itemTo = moment(item.to)
        var itemFrom = moment(item.from)

        if(itemFrom.isBefore(to) && (itemTo.isAfter(from))) { // if its in range
            var includeInvestment = true
            if(itemFrom.isBefore(from)) {
                itemFrom = from
                includeInvestment = false
            } else if(itemTo.isAfter(to)) {
                itemTo = to
            }

            var startN = getNAt(Narray, itemFrom)
            var avgN = getAverageNValue(Narray, itemFrom, itemTo)

            totalShares += calculateShares(itemFrom,itemTo, item, startN, avgN, includeInvestment)
        }
    }

    return totalShares
}


// return the number of man-hours recorded over a period of time
// normalizedEquity - A list of normalized personal equity objects (as returned from normalizePersonalEquity)
// from - the date which to start summing from (inclusive)
// to - the date which to sum to (exclusive)
exports.sumManHours = function(normalizedEquity, _from, _to) {
    var from = moment(_from)
    var to = moment(_to)

    var totalManHours = 0
    for(var n=0; n<normalizedEquity.length; n++) {
        var item = normalizedEquity[n]
        var itemTo = moment(item.to)
        var itemFrom = moment(item.from)

        if(!itemTo.isBefore(from) && !itemFrom.isAfter(to)) { // if its in range
            var includeInvestment = true
            if(itemFrom.isBefore(from)) {
                itemFrom = from
                includeInvestment = false
            } else if(itemTo.isAfter(to)) {
                itemTo = to
            }

            var days = subtractMoments(itemTo, itemFrom)
            totalManHours += item.W*days
        }
    }

    return totalManHours
}

// returns the shares per dollar for a given value of N
exports.sharesPerDollar = function(N) {
    return N/.6
}

// returns the normalizedEquity object with a couple additional fields:
    // runningTotal - A running sum of the equity
    // runningFracion - A running fraction of the equity (a number between 0 and 1)
    // N - An array where the first element is N on the 'from' date, and the last element is the N on the DAY BEFORE 'end' date (so that its inclusive)
// normalizedEquity - A list of normalized personal equity objects (as returned from normalizePersonalEquity)
// totals - A normalizedEquity of the total equity earnings of the company
exports.summary = function(normalizedEquity, totals, Narray) {
    var result = []

    var runningTotal = 0
    var companyRunningTotal = 0, companyTotaledTil = totals[0].from
    for(var n=0; n<normalizedEquity.length; n++) {
        var item = normalizedEquity[n]
        var start = moment(item.from), end = moment(item.to)

        var nRanges = getNRanges(Narray, start, end)
        nRanges.forEach(function(nRange, index) {
            var startN = getNAt(Narray, nRange.from)
            var avgN = getAverageNValue(Narray, nRange.from, nRange.to)

            var resultItem = copy(item)
            if(index !== 0) resultItem.D = resultItem.C = 0 // don't double count investments
            resultItem.from = nRange.from.format('YYYY-MM-DD')
            resultItem.to = nRange.to.format('YYYY-MM-DD')

            var shares = calculateShares(nRange.from,nRange.to, resultItem, startN, avgN, true)
            runningTotal+= shares
            companyRunningTotal += exports.sumShares(totals, Narray, companyTotaledTil, nRange.to.format('YYYY-MM-DD'))
            companyTotaledTil = item.to

            resultItem.runningTotal = runningTotal
            resultItem.runningFraction = runningTotal/companyRunningTotal
            resultItem.N = nRange.range

            result.push(resultItem)
        })
    }

    return result
}


var calculateShares = exports.calculateShares = function(from, to, data, startN, Navg, includeDollarsAndContractedEquity) {
    from = moment(from), to = moment(to)

    if(includeDollarsAndContractedEquity === undefined) includeDollarsAndContractedEquity = true

    var daysInNewRange = to.diff(from,'days')
    var Nmultiplier = daysInNewRange*Navg

    var S = data.S
    var W = data.W
    if(includeDollarsAndContractedEquity) {
        var C = data.C, D = data.D
    } else {
        var C = 0, D = 0
    }

    return Nmultiplier*W*S/365 + startN*(C + D/0.6)
}

// merges two people into an average
function mergePeople(a,b) {
    var results = []

    if(moment(b[0].from).isBefore(moment(a[0].from))) {
        var curTime = moment(b[0].from)
    } else {
        var curTime = moment(a[0].from)
    }

    var bn = 0, an=0
    var aDollarsCounted = false, bDollarsCounted = false
    while(bn < b.length && an < a.length) {
        var aFrom = moment(a[an].from), aTo = moment(a[an].to)
        var bFrom = moment(b[bn].from), bTo = moment(b[bn].to)

        // b's range is before a's range
        if( ! bTo.isAfter(aFrom)) {
            nonOverlappingItem(b[bn])
            bn++

        // a's range is before b's range
        } else if( ! aTo.isAfter(bFrom)) {
            nonOverlappingItem(a[an])
            an++

        // overlapping
        } else {

            // b starts before a
            if(bFrom.isBefore(aFrom) && curTime.isBefore(aFrom)) {
                overlappingItem(b[bn], a[an])

            // a starts before b
            } else if(aFrom.isBefore(bFrom) && curTime.isBefore(bFrom)) {
                overlappingItem(a[an], b[bn])

            // start at same time
            } else {

                var D=0, C=0
                if(!aDollarsCounted) {
                    aDollarsCounted = true
                    C += a[an].C
                    D += a[an].D
                }
                if(!bDollarsCounted) {
                    bDollarsCounted = true
                    C += b[bn].C
                    D += b[bn].D
                }

                // b ends before a
                if(bTo.isBefore(aTo)) {
                    var overlapEnd = bTo
                    var increment = 'b'

                // a ends before b
                } else if(aTo.isBefore(bTo)) {
                    var overlapEnd = aTo
                    var increment = 'a'

                // end at same time
                } else {
                    var overlapEnd = aTo
                    var increment = 'both'
                }

                var totalW = a[an].W+b[bn].W

                // combine parts that overlap
                var totalItem = {
                    from: curTime.format('YYYY-MM-DD'), to: overlapEnd.format('YYYY-MM-DD'),
                    //N: splitNRange(a[an].N, aFrom,aTo, curTime,overlapEnd),             // should be same for both 'a' and 'b', so choosing 'a' is arbitrary
                    S: a[an].S*(a[an].W/totalW) + b[bn].S*(b[bn].W/totalW),   // weighted average
                    W: a[an].W+b[bn].W,   // total
                    C:C, D: D,
                }

                results.push(totalItem)
                curTime = overlapEnd

                if(increment === 'a' || increment === 'both') {
                    an++
                    aDollarsCounted = false
                }
                if(increment === 'b' || increment === 'both') {
                    bn++
                    bDollarsCounted = false
                }
            }
        }
    }

    return results

    function nonOverlappingItem(x) {
        var newItem = copy(x)
        newItem.from = curTime.format('YYYY-MM-DD')
        results.push(newItem)
        curTime = moment(x.to)
    }

    function overlappingItem(x, y) {
        var itemBefore = copy(x)
        x.D=0;x.C=0 // don't duplicate the investment (note that this mutates the input, todo: fix this)
        //itemBefore.D = 0 // D is added in elsewhere
        //itemBefore.N = splitNRange(itemBefore.N, moment(itemBefore.from),moment(itemBefore.to), curTime, moment(y.from))
        itemBefore.from = curTime.format('YYYY-MM-DD')
        itemBefore.to = y.from
        results.push(itemBefore)
        curTime = moment(y.from)
    }
}

// returns an array where each object looks like:
    // {from:_, to:_, N:_} and to is non-inclusive
var NToArray = exports.NToArray = function(N, fromTime, endTime) {
    var result = []
    for(var date in N) {
        result.push({from: moment(date), N: N[date]})
    }

    result = result.sort(dateSortFn)

    if(result[0].from.isBefore(fromTime)) {
        throw new Error("N has values before the given start date - can't calculate N")
    }

    result.unshift({from:moment(fromTime), N:50*result[0].N})

    for(var n=0; n<result.length; n++) {
        if(n+1<result.length) {
            result[n].to = result[n+1].from  // note: to is non-inclusive
        } else {
            result[n].to = moment(endTime)
        }
    }

    return result
}

// tprev - the time Nprev
var calculateN = exports.calculateN = function(tprev, tnext, Nprev, Nnext, x) {
    return Nprev - x.diff(tprev,'days')*(Nprev - Nnext)/tnext.diff(tprev,'days')
}
var calculateNRange = exports.calculateNRange = function(tprev, tnext, Nprev, Nnext, from, to) {
    return [calculateN(tprev,tnext, Nprev,Nnext, from), calculateN(tprev,tnext, Nprev,Nnext, to)]
}

// gets an N value on a particular day
// Narray - the output of NToArray
// t - a moment representing the day to get N for
function getNValueFromSet(Narray, t) {
    for(var n=0; n<Narray; n++) {
        if((Narray[n].from.isBefore(t) || Narray[n].from.isSame(t)) && Narray[n].to.isAfter(t)) {
            return calculateN(Narray[n].from, Narray[n].to, Narray[n].N, Narray[n+1].N, t)
        }
    }
}

// gets the value of N on a date
function getNAt(Narray, date) {
    for(var n=0; n<Narray.length; n++) {
        if((Narray[n].from.isBefore(date) || Narray[n].from.isSame(date)) && Narray[n].to.isAfter(date)) {
            return calculateN(Narray[n].from, Narray[n].to, Narray[n].N, Narray[n+1].N, date)
        }
    }
}
function getAverageNValue(Narray, from, to) {
    var Ns = getNRanges(Narray, from, to)

    var sum = 0, totalDays = 0
    Ns.forEach(function(item) {
        var avg = (item.range[0]+item.range[1])/2
        var days = item.to.diff(item.from, 'days')
        sum+= avg*days
        totalDays+= days
    })

    return sum/totalDays // average over those days
}

// returns an array where each element is an object with the properties:
    // from - from date
    // to - to date
    // range - [Nstart, Nend]
function getNRanges(Narray, from, to) {
    var Ns = []
    for(var n=0; n<Narray.length; n++) {
        if(Narray[n].from.isBefore(from)) {
            var start = from
        } else {
            var start = Narray[n].from
        }

        if(Narray[n].to.isBefore(to)) {
            var end = Narray[n].to
        } else {
            var end = to
        }

        if(start.isBefore(end)) {
            var nRange = calculateNRange(Narray[n].from, Narray[n].to, Narray[n].N, Narray[n+1].N, start,end.clone().subtract(1,'days'))
            Ns.push({from: start, to: end, range: nRange})
        }
    }

    return Ns
}

// returns the range of N with a later new start date, an earlier new end date, or both
function splitNRange(curNrange, curFrom, curTo, newFrom, newTo) {
    var aDuration = curTo.diff(curFrom,'days')
    var Nslope = (curNrange[1]-curNrange[0])/aDuration

    return [curNrange[0]+Nslope*newFrom.diff(curFrom,'days'), curNrange[0]+Nslope*newTo.diff(curFrom,'days')]
}

// turns a persons changes into an array of changes sorted by date
function personToArray(person, endTime) {
    var result = []
    var curValues = {S: 0, W: 0}
    for(var date in person) {
        var changes = person[date]
        result.push({from: moment(date), S: newValue(changes, 'S'), W: newValue(changes, 'W'), D: newValue(changes, 'D'), C: newValue(changes, 'C')})
    }

    result.sort(dateSortFn)

    for(var n=0; n<result.length; n++) {
        if(n+1<result.length) {
            result[n].to = result[n+1].from  // note: to is non-inclusive
        } else {
            result[n].to = endTime
        }
    }

    return result

    function newValue(changes, property) {
        if(property === 'D')
            return changes.D || 0
        else if(property === 'C')
            return changes.C || 0
        else {
            if(changes[property] !== undefined) {
                var newValue = changes[property]
            } else {
                var newValue = curValues[property]
            }

            curValues[property] = newValue
            return newValue
        }
    }
}

function dateSortFn(a,b) {
    return a.from.unix() - b.from.unix()
}

// shallow copies an object
function copy(y) {
    var result = {}
    for(var x in y) {
        result[x] = y[x]
    }
    return result
}

// returns a-b in days
function subtractMoments(a,b) {
    return a.diff(b, 'days')
    //return moment.duration(a.unix() - b.unix(), 'seconds').as('days')
}




