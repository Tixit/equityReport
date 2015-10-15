"use strict";

var Unit = require('deadunit')
var pie = require('../pieReport')
var moment = require("moment")

var k=1000

Unit.test("Testing pieReport", function() {



    //*

    this.test("normalizePersonalEquity", function() {
        var N = {
            '2015-10-01': 100
        }
        var data = {
            '2015-10-01': {S:100*1000, W:1}
        }

        var result = pie.normalizePersonalEquity(N, data, '2015-10-15')
        this.ok(equal(result, [
            {from: "2015-10-01", to: "2015-10-15", S: 100*1000, W:1, N: 100, D:0}
        ]), result)


        N = {
            '2015-10-01': 100,
            '2015-11-01': 25
        }
        data = {
            '2015-10-01': {S:100*1000, W:1},
            '2015-10-11': {W:.5},
            '2015-10-21': {D: 1000},
            '2015-11-11': {D: 1000}
        }

        result = pie.normalizePersonalEquity(N, data, '2015-11-15')
        this.ok(equal(result, [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: 100, D:0},
            {from: "2015-10-11", to: "2015-10-21", S: 100*1000, W:.5, N: 100, D:0},
            {from: "2015-10-21", to: "2015-11-01", S: 100*1000, W:.5, N: 100, D:1000},
            {from: "2015-11-01", to: "2015-11-11", S: 100*1000, W:.5, N: 25, D:0},
            {from: "2015-11-11", to: "2015-11-15", S: 100*1000, W:.5, N: 25, D:1000}
        ]), result)
    })

    this.test("total", function(){
        var N = {
            '2015-10-01': 100,
            '2015-11-06': 25
        }
        var personOne = {
            '2015-10-01': {S:100*1000, W:1},    // nonexistent in personTwo
            '2015-10-11': {W:.5},               // identical range in personTwo
            '2015-10-21': {D: 1000},
            '2015-11-11': {W: 1}
        }
        var personTwo = {
            '2015-10-11': {S:50*1000, W:1},
            '2015-10-21': {D: 1000},
            '2015-11-01': {W:.25},              // range starts the same, but ends different from personTwo
            '2015-11-11': {W: 1}                // range ends the same, but starts different from personTwo
        }

        // 10-01 - 10-11, 10-11 - 10-21, 10-21 - 11-01, 11-01 - 11-06, 11-06 - 11-11, 11-11 - 11-15

        var person1 = pie.normalizePersonalEquity(N, personOne, '2015-11-15')
        var person2 = pie.normalizePersonalEquity(N, personTwo, '2015-11-15')

//        this.log(person1)
//        this.log(person2)

        var result = pie.total([person1, person2])

        this.eq(result.length, 6)

        var index = 0
        this.ok(equal(result[index], {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: 100, D:0}),result[index]);index++

        var itemEquityTotal = result[index].N*result[index].S/365*result[index].W*10
        var itemEquitySum =  100*(100*k/365*0.5*10 + 50*k/365*1*10)
        this.ok(itemEquitySum -.0001 <= itemEquityTotal&&itemEquityTotal <= itemEquitySum +.0001) // it should be really close
        this.ok(equal(result[index], {from: "2015-10-11", to: "2015-10-21", S: 100*k*(0.5/1.5) + 50*k*(1/1.5), W:1.5, N: 100, D:0}),result[index]);index++
        this.ok(equal(result[index], {from: "2015-10-21", to: "2015-11-01", S: 100*k*(0.5/1.5) + 50*k*(1/1.5), W:1.5, N: 100, D:2000}),result[index]);index++

        this.ok(equal(result[index], {from: "2015-11-01", to: "2015-11-06", S: 100*k*(0.5/0.75) + 50*k*(0.25/0.75), W:0.75, N: 100, D:0}),result[index]);index++
        this.ok(equal(result[index], {from: "2015-11-06", to: "2015-11-11", S: 100*k*(0.5/0.75) + 50*k*(0.25/0.75), W:0.75, N: 25, D:0}),result[index]);index++
        this.ok(equal(result[index], {from: "2015-11-11", to: "2015-11-15", S: 100*k*(1/2) + 50*k*(1/2), W:2, N: 25, D:0}),result[index]);index++
    })

    this.test("newMemberTransform", function() {
        var normalizedMemberData = [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: 100, D:0},
            {from: "2015-10-11", to: "2015-10-21", S: 100*1000, W:.5, N: 100, D:0},
            {from: "2015-10-21", to: "2015-10-31", S: 100*1000, W:.5, N: 100, D:1000},
            {from: "2015-10-31", to: "2015-11-08", S: 100*1000, W:.5, N: 25, D:0},
            {from: "2015-11-08", to: "2015-11-15", S: 100*1000, W:.5, N: 25, D:1000}
        ]

        var newData = pie.newMemberTransform(normalizedMemberData, .5, .1, 5)
        this.eq(newData.length, 7)
        this.ok(equal(newData[0], {from: "2015-10-01", to: "2015-10-06", S: 100*1000*.5, W:1, N: 100, D:0}))
        this.ok(equal(newData[1], {from: "2015-10-06", to: "2015-10-11", S: 100*1000*.6, W:1, N: 100, D:0}))
        this.ok(equal(newData[2], {from: "2015-10-11", to: "2015-10-21", S: 100*1000*.7, W:.5, N: 100, D:0}))
        this.ok(equal(newData[3], {from: "2015-10-21", to: "2015-10-31", S: 100*1000*.8, W:.5, N: 100, D:1000}))
        this.ok(equal(newData[4], {from: "2015-10-31", to: "2015-11-08", S: 100*1000*.9, W:.5, N: 25, D:0}))
        this.ok(equal(newData[5], {from: "2015-11-08", to: "2015-11-09", S: 100*1000*.9, W:.5, N: 25, D:1000}))
        this.ok(equal(newData[6], {from: "2015-11-09", to: "2015-11-15", S: 100*1000, W:.5, N: 25, D:0}))
        //this.log(newData)

    })

    this.test("sumShares", function() {
        var data = [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: 100, D:0},
            {from: "2015-10-11", to: "2015-10-21", S: 75*1000, W:1.5, N: 100, D:0},
            {from: "2015-10-21", to: "2015-11-01", S: 75*1000, W:1.5, N: 100, D:2000},
            {from: "2015-11-01", to: "2015-11-06", S: 75*1000, W:0.75, N: 100, D:0},
            {from: "2015-11-06", to: "2015-11-11", S: 75*1000, W:0.75, N: 25, D:0},
            {from: "2015-11-11", to: "2015-11-15", S: 75*1000, W:2, N: 25, D:0}
        ]

        var result = pie.sumShares(data, '2015-10-05', '2015-11-13')

        this.eq(result,
           //Salary/365 *N * days *W   + N * D   /.6
            100*1000/365*100*6 +
            75*1000/365 *100*10   *1.5 +
            75*1000/365 *100*11   *1.5 + 100*2000/.6  +
            75*1000/365 *100*5    *.75 +
            75*1000/365 *25 *5    *.75 +
            75*1000/365 *25*2    *2)
    })

    this.test("sumManHours", function() {
        var data = [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: 100, D:0},
            {from: "2015-10-11", to: "2015-10-21", S: 75*1000, W:1.5, N: 100, D:0},
            {from: "2015-10-21", to: "2015-11-01", S: 75*1000, W:1.5, N: 100, D:2000},
            {from: "2015-11-01", to: "2015-11-06", S: 75*1000, W:0.75, N: 100, D:0},
            {from: "2015-11-06", to: "2015-11-11", S: 75*1000, W:0.75, N: 25, D:0},
            {from: "2015-11-11", to: "2015-11-15", S: 75*1000, W:2, N: 25, D:0}
        ]

        var result = pie.sumManHours(data, '2015-10-05', '2015-11-13')
        this.eq(result, 6+1.5*10+1.5*11 +.75*5 +.75*5+2*2)
    })

    this.test("summary", function(t) {
        var N = {
            '2015-10-01': 100,
            '2015-11-06': 25
        }
        var personOne = {
            '2015-10-01': {S:100*1000, W:1},    // nonexistent in personTwo
            '2015-10-11': {W:.5},               // identical range in personTwo
            '2015-10-21': {D: 1000},
            '2015-11-11': {W: 1}
        }
        var personTwo = {
            '2015-10-11': {S:50*1000, W:1},
            '2015-10-21': {D: 1000},
            '2015-11-01': {W:.25},              // range starts the same, but ends different from personTwo
            '2015-11-11': {W: 1}                // range ends the same, but starts different from personTwo
        }

        // 10-01 - 10-11, 10-11 - 10-21, 10-21 - 11-01, 11-01 - 11-06, 11-06 - 11-11, 11-11 - 11-15

        var person1 = pie.normalizePersonalEquity(N, personOne, '2015-11-15')
        var person2 = pie.normalizePersonalEquity(N, personTwo, '2015-11-15')
        var totals = pie.total([person1, person2])

        var result = pie.summary(person1, totals)

        var total1A = 100*k/365*100*10
        var fraction1A = 1

        var total1B = total1A+100*k/365*100*10*.5, total2B = 50*k/365*100*10
        var fraction1B = total1B/(total1B+total2B), fraction2B = total2B/(total1B+total2B)

        var total1C = total1B+100*k/365*100*16*.5+100*1000/.6, total2_1021to1106 = total2B + 50*k/365*100*11 + 100*1000/.6 + 50*k/365*100*5*.25
        var fraction1C = total1C/(total1C+total2_1021to1106)
        var total2C = total2B+50*k/365*100*11*1+100*1000/.6, total1_1021to1101 = total1B+100*k/365*100*11*.5+100*1000/.6
        var actualTotal2C = 454337.89954337897, actualFraction2C = 0.3841698841698841
        var fraction2C = total2C/(actualTotal2C+total1_1021to1101)

        var total1D = total1C + 100*k/365*25*5*.5, total2_1106to1111 = total2_1021to1106 + 50*k/365*25*5*.25
        var fraction1D = total1D/(total1D+total2_1106to1111)
        var actualFraction1D = 0.6311130781146269
        var total2D = actualTotal2C + 50*k/365*100*5*.25, total1_1101to1106 = total1_1021to1101+100*k/365*100*5*.5
        var fraction2D = total2D/(total2D+total1_1101to1106)

        var total1E = total1D + 100*k/365*25* 4, total2F = total2_1106to1111 + 50*k/365*25*4
        var actualTotal2E = 475742.00913242006
        var fraction1E = total1E/(total1E+total2F), fraction2E = actualTotal2E/(total1E+actualTotal2E)

        var fraction2F = total2F/(total2F+total1E)

        var item = function(item) {
            t.ok(equal(result[index], item), result[index], item); index++
        }

        this.eq(result.length, 5)
        var index = 0
        item({from: "2015-10-01", to: "2015-10-11", S: 100*k, W:1, N: 100, D:0, runningTotal:total1A, runningFraction: fraction1A})
        item({from: "2015-10-11", to: "2015-10-21", S: 100*k, W:.5, N: 100, D:0, runningTotal:total1B, runningFraction: fraction1B})
        item({from: "2015-10-21", to: "2015-11-06", S: 100*k, W:.5, N: 100, D:1000, runningTotal:total1C, runningFraction: fraction1C})
        this.ok(fraction1D -.0001 <= actualFraction1D&&actualFraction1D <= fraction1D +.0001) // should be really close
        item({from: "2015-11-06", to: "2015-11-11", S: 100*k, W:.5, N: 25, D:0, runningTotal:total1D, runningFraction: actualFraction1D})
        item({from: "2015-11-11", to: "2015-11-15", S: 100*k, W:1, N: 25, D:0, runningTotal:total1E, runningFraction: fraction1E})

        result = pie.summary(person2, totals)
        this.eq(result.length, 5)
        index = 0
        item({from: "2015-10-11", to: "2015-10-21", S: 50*k, W:1, N: 100, D:0, runningTotal:total2B, runningFraction: fraction2B})
        this.ok(total2C -.0001 <= actualTotal2C&&actualTotal2C <= total2C +.0001) // should be really close
        this.ok(fraction2C -.0001 <= actualFraction2C&&actualFraction2C <= fraction2C +.0001) // should be really close
        item({from: "2015-10-21", to: "2015-11-01", S: 50*k, W:1, N: 100, D:1000, runningTotal:actualTotal2C, runningFraction: actualFraction2C})
        item({from: "2015-11-01", to: "2015-11-06", S: 50*k, W:.25, N: 100, D:0, runningTotal:total2D, runningFraction: fraction2D})
        this.ok(total2_1106to1111 -.0001 <= actualTotal2E&&actualTotal2E <= total2_1106to1111 +.0001) // should be really close
        item({from: "2015-11-06", to: "2015-11-11", S: 50*k, W:.25, N: 25, D:0, runningTotal:actualTotal2E, runningFraction: fraction2E})
        item({from: "2015-11-11", to: "2015-11-15", S: 50*k, W:1, N: 25, D:0, runningTotal:total2F, runningFraction: fraction2F})
    })

    this.test("former bugs", function() {
        this.test("total - negative date range", function(t) {

            var personData = [
                [   { from: '2014-01-01',S: 138,W: 0.25,D: 0,to: '2014-01-16',N: 100 },
                    { from: '2014-01-16',S: 173,W: 0.25,D: 0,to: '2014-01-31',N: 100 },
                    { from: '2014-01-31',S: 345,W: 0.25,D: 20,to: '2015-10-14',N: 100 }
                ],[
                    { from: '2015-02-19',S: 44000,W: 0.125,D: 0,to: '2015-03-06',N: 100 },
                    { from: '2015-03-06',S: 88000,W: 0.125,D: 0,to: '2015-05-05',N: 100 },
                    { from: '2015-05-05',S: 110000,W: 0.125,D: 0,to: '2015-10-14',N: 100 }
                ]
            ]

            var results = pie.total(personData)
            results.forEach(function(result) {
                if(moment(result.to).isBefore(moment(result.from))) {
                    t.ok(false)
                }
            })
        })
    })

    //*/

}).writeConsole(2000)


// compares arrays and objects for value equality (all elements and members must match)
function equal(a,b) {
    if(a instanceof Array) {
        if(!(b instanceof Array))
            return false
        if(a.length !== b.length) {
            return false
        } else {
            for(var n=0; n<a.length; n++) {
                if(!equal(a[n],b[n])) {
                    return false
                }
            }
            // else
            return true
        }
    } else if(a instanceof Object) {
        if(!(b instanceof Object))
            return false

        var aKeys = Object.keys(a)
        var bKeys = Object.keys(b)

        if(aKeys.length !== bKeys.length) {
            return false
        } else {
            for(var n=0; n<aKeys.length; n++) {
                var key = aKeys[n]
                var aVal = a[key]
                var bVal = b[key]

                if(!equal(aVal,bVal)) {
                    return false
                }
            }
            // else
            return true
        }
    } else {
        return a===b || Number.isNaN(a) && Number.isNaN(b)
    }
}