"use strict";

var moment = require('moment')

// !! Parameter note: All dates need to be in a form that moment can recognize (ie `moment(<date>)` gives a correct date object)

// Calculates a normalized list giving the value of the equity-variables for a person over the dates they've been working
// N - An object where each key is a date, and each value is the value of the Need value of the company changed to on that date.
// person - an object where the key is a date, and the value is an object describing a change in equity variables for that date.
    // The key <date> needs to be in a form that moment can recognize (ie `moment(<date>)` gives a correct date object)
    // The value is an object with the properties:
        // S - Salary equivalent changed to on that date.
        // W - Work-rate (percentage of full-time) changed to on that date.
        // D - A number of dollars invested on that date.
        // note - Adds a text note about the change.
// toDate - the date to calculate through (inclusive)
// returns a list of objects defining the equity-variables in various date ranges. Each object has the properties:
    // from - The date, as a unix timestamp, of the beginning of the range (inclusive)
    // to - The date, as a unix timestamp, of the end of the date range (exclusive)
    // S - Salary equivalent
    // W - Work-rate (percentage of full-time)
    // N - The company Need variable
    // D - Dollars invested on the 'from' date
exports.normalizePersonalEquity = function(N, person, toDate_) {
    var toDate = moment(toDate_)

    var normalizedPerson = personToArray(person, toDate)
    //console.log(JSON.stringify(normalizedPerson))
    var NArray = NToArray(N, toDate)

    var curIndex = 0
    for(var n=0; n<NArray.length; n++) {
        var NData = NArray[n]

        while(curIndex < normalizedPerson.length) {
            //console.log(NData.from.format('YYYY-MM-DD')+' - '+NData.to.format('YYYY-MM-DD')+'  '+normalizedPerson[curIndex].from.format('YYYY-MM-DD')+' - '+normalizedPerson[curIndex].to.format('YYYY-MM-DD'))
            // N range is before person range
            if( ! NData.to.isAfter(normalizedPerson[curIndex].from)) {
                break; // do nothing, continue on with the next N change

            // N range covers at least part of person range
            } else if(!NData.from.isAfter(normalizedPerson[curIndex].from)) {
                normalizedPerson[curIndex].N = NData.N

                // N range covers all of person range
                if(!NData.to.isBefore(normalizedPerson[curIndex].to)) {
                    curIndex++
                    continue; // there's more for this N to do

                // N range covers part of person range
                } else {
                    var newEntry = copy(normalizedPerson[curIndex])
                    newEntry.D = 0 // don't duplicate the investment counted
                    normalizedPerson.splice(curIndex+1,0,newEntry)
                    normalizedPerson[curIndex].to = normalizedPerson[curIndex+1].from = NData.to
                    curIndex++
                    break;
                }
            } else {
                throw new Error("unexpected: "+JSON.stringify(NData)+" - "+normalizedPerson[curIndex].from+' '+JSON.stringify(person))
            }
        }
    }

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

            normalizedPerson.splice(n+1, 0, copy(dateItem))
            dateItem.to = normalizedPerson[n+1].from = newDate.format('YYYY-MM-DD')
            dateItem.S = Math.round(dateItem.S * currentFraction)
            if(dateItem.D !== undefined)
                normalizedPerson[n+1].D = 0

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
// from - the date which to start summing from (inclusive)
// to - the date which to sum to (exclusive)
exports.sumShares = function(normalizedEquity, _from, _to) {
    var from = moment(_from)
    var to = moment(_to)

    var totalShares = 0
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
            totalShares += calculateShares(days, item, includeInvestment)
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



function calculateShares(days, data, includeDollars) {
    if(includeDollars === undefined) includeDollars = true

    var N = data.N
    var S = data.S
    var W = data.W
    if(includeDollars) var D = data.D
    else               var D = 0

    return N*(days*W*S/365 + D/0.6)
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

        // b range is before a's range
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
                overlappingItem(b[bn], aFrom)

            // a starts before b
            } else if(aFrom.isBefore(bFrom) && curTime.isBefore(bFrom)) {
                overlappingItem(a[an], bFrom)

            // start at same time
            } else {

                var D = 0
                if(!aDollarsCounted) {
                    aDollarsCounted = true
                    D += a[an].D
                }
                if(!bDollarsCounted) {
                    bDollarsCounted = true
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

                // combine parts that overlap
                var totalItem = {
                    from: curTime.format('YYYY-MM-DD'), to: overlapEnd.format('YYYY-MM-DD'),
                    N: a[an].N,               // should be same for both a and b, so this is arbitrary
                    S: (a[an].S+b[bn].S)/2,   // average
                    W: a[an].W+b[bn].W,   // total
                    D: D,
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

    function overlappingItem(x, to) {
        var itemBefore = copy(x)
        itemBefore.D = 0 // D is added in elsewhere
        itemBefore.from = curTime.format('YYYY-MM-DD')
        itemBefore.to = to
        results.push(itemBefore)
        curTime = momen(x.to)
    }
}

function NToArray(N, endTime) {
    var result = []
    for(var date in N) {
        result.push({from: moment(date), N: N[date]})
    }

    result = result.sort(dateSortFn)

    for(var n=0; n<result.length; n++) {
        if(n+1<result.length) {
            result[n].to = result[n+1].from  // note: to is non-inclusive
        } else {
            result[n].to = endTime
        }
    }

    return result
}

// turns a persons changes into an array of changes sorted by date
function personToArray(person, endTime) {
    var result = []
    var curValues = {S: 0, W: 0}
    for(var date in person) {
        var changes = person[date]
        result.push({from: moment(date), S: newValue(changes, 'S'), W: newValue(changes, 'W'), D: newValue(changes, 'D')})
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
