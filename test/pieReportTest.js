"use strict";

var Unit = require('deadunit')
var pie = require('../pieReport')
var moment = require("moment")

var k=1000

Unit.test("Testing pieReport", function() {





    //*

    this.test("normalizePersonalEquity", function() {
        var N = {
            '2016-06-01': 2
        }
        var data = {
            '2015-10-01': {S:100*1000, W:1}
        }

        var result = pie.normalizePersonalEquity(N, data, '2015-10-01', '2015-10-15')
        var N = calculateNRange('2015-10-01', '2016-06-01', 100, 2, '2015-10-01', "2015-10-15")
        var expected = [
            {from: "2015-10-01", to: '2015-10-15', S: 100*1000, W:1, N: N, C:0, D:0}  // N starts 50 times higher than the first change in N
        ]
        this.ok(equal(result, expected), result, expected)


        N = {
            '2015-10-25': 1
        }
        data = {
            '2015-10-01': {S:100*1000, W:1},
            '2015-10-11': {W:.5},
            '2015-10-21': {D: 1000, C:900},
            '2015-11-11': {D: 1000}
        }

        result = pie.normalizePersonalEquity(N, data, '2015-09-01', '2015-11-15')
        expected = [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, D:0, C:0,
                N: calculateNRange('2015-09-01', '2015-10-25', 50, 1, "2015-10-01", "2015-10-11")},
            {from: "2015-10-11", to: "2015-10-21", S: 100*1000, W:.5, D:0, C:0,
                N: calculateNRange('2015-09-01', '2015-10-25', 50, 1, "2015-10-11", "2015-10-21")},

            {from: "2015-10-21", to: "2015-10-25", S: 100*1000, W:.5, D:1000, C:900,
                N: calculateNRange('2015-09-01', '2015-10-25', 50, 1, "2015-10-21", "2015-10-25")},
            {from: "2015-10-25", to: "2015-11-11", S: 100*1000, W:.5, D:0, C:0, N: [1,1]},

            {from: "2015-11-11", to: "2015-11-15", S: 100*1000, W:.5, D:1000, C:0, N: [1,1]}
        ]
        this.ok(equal(result, expected), result, expected)
    })

    this.test("total", function(){
        var N = {
            '2015-11-06': 1,
            '2016-06-01':.5,
        }
        var personOne = {
            '2015-10-01': {S:100*1000, W:1},    // nonexistent in personTwo
            '2015-10-10': {W:.5},               // identical range in personTwo
            '2015-10-21': {D: 1000},
            '2015-11-11': {W: 1, C:50}
        }
        var personTwo = {
            '2015-10-11': {S:50*1000, W:1},
            '2015-10-21': {D: 1000},
            '2015-11-01': {W:.25,C:900},        // range starts the same, but ends different from personTwo
            '2015-11-11': {W: 1, C:50}                // range ends the same, but starts different from personTwo
        }

        // 10-01 - 10-11, 10-11 - 10-21, 10-21 - 11-01, 11-01 - 11-06, 11-06 - 11-11, 11-11 - 11-15

        var person1 = pie.normalizePersonalEquity(N, personOne, '2015-10-01', '2015-11-15')
        var person2 = pie.normalizePersonalEquity(N, personTwo, '2015-10-01', '2015-11-15')

//        this.log(person1)
//        this.log(person2)

        var result = pie.total([person1, person2])

        this.eq(result.length, 7)

        var N0 = calculateNRange('2015-10-01', '2015-11-06', 50, 1, "2015-10-01", "2015-10-10")
        var index = 0, expected = {
            from: "2015-10-01", to: "2015-10-10", S: 100*1000, W:1, N: N0, D:0, C:0
        }
        this.ok(equal(result[index], expected),result[index], expected);index++

//        var itemEquityTotal = result[0].N*result[0].S/365*result[0].W*10
//        var itemEquitySum =  100*(100*k/365*0.5*10 + 50*k/365*1*10)
//        this.ok(itemEquitySum -.0001 <= itemEquityTotal&&itemEquityTotal <= itemEquitySum +.0001) // it should be really close

        var N0p5 = calculateNRange('2015-10-01', '2015-11-06', 50, 1, "2015-10-10", "2015-10-11")
        var N1 = calculateNRange('2015-10-01', '2015-11-06', 50, 1, "2015-10-11", "2015-10-21")
        var N2 = calculateNRange('2015-10-01', '2015-11-06', 50, 1, "2015-10-21", "2015-11-01")
        var N3 = calculateNRange('2015-10-01', '2015-11-06', 50, 1, "2015-11-01", "2015-11-06")
        var N4 = calculateNRange('2015-11-06', '2016-06-01', 1, .5, "2015-11-06", "2015-11-11")
        var N5 = calculateNRange('2015-11-06', '2016-06-01', 1, .5, "2015-11-11", "2015-11-15")

        expected={from: "2015-10-10", to: "2015-10-11", S: 100*1000, W:.5, N: N0p5, D:0,C:0};this.ok(equal(result[index], expected),result[index],expected);index++
        expected={from: "2015-10-11", to: "2015-10-21", S: 100*k*(0.5/1.5) + 50*k*(1/1.5), W:1.5, N: N1, D:0,C:0};this.ok(equal(result[index], expected),result[index],expected);index++
        this.ok(aproxEq(N2[0],result[index].N[0]), N2[0],result[index].N[0])
        this.ok(aproxEq(N2[1],result[index].N[1]), N2[1],result[index].N[1])
        expected={from: "2015-10-21", to: "2015-11-01", S: 100*k*(0.5/1.5) + 50*k*(1/1.5), W:1.5, N: result[index].N, D:2000,C:0};this.ok(equal(result[index], expected),result[index],expected);index++

        this.ok(aproxEq(N3[0],result[index].N[0]), N3[0],result[index].N[0])
        this.ok(aproxEq(N3[1],result[index].N[1]), N3[1],result[index].N[1])
        expected={from: "2015-11-01", to: "2015-11-06", S: 100*k*(0.5/0.75) + 50*k*(0.25/0.75), W:0.75, N: result[index].N, D:0,C:900};this.ok(equal(result[index], expected),result[index],expected);index++
        expected={from: "2015-11-06", to: "2015-11-11", S: 100*k*(0.5/0.75) + 50*k*(0.25/0.75), W:0.75, N: N4, D:0,C:0};this.ok(equal(result[index], expected),result[index],expected);index++
        expected={from: "2015-11-11", to: "2015-11-15", S: 100*k*(1/2) + 50*k*(1/2), W:2, N: N5, D:0,C:100};this.ok(equal(result[index], expected),result[index],expected);index++
    })

    this.test("newMemberTransform", function() {
        var normalizedMemberData = [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: [100,90], D:0, C:0},
            {from: "2015-10-11", to: "2015-10-21", S: 100*1000, W:.5, N: [90,80], D:0, C:0},
            {from: "2015-10-21", to: "2015-10-31", S: 100*1000, W:.5, N: [80,70], D:1000, C:900},
            {from: "2015-10-31", to: "2015-11-08", S: 100*1000, W:.5, N: [70,68], D:0, C:900},
            {from: "2015-11-08", to: "2015-11-15", S: 100*1000, W:.5, N: [68,68], D:1000, C:0}
        ]

        var newData = pie.newMemberTransform(normalizedMemberData, .5, .1, 5)
        this.eq(newData.length, 7)
        this.ok(equal(newData[0], {from: "2015-10-01", to: "2015-10-06", S: 100*1000*.5, W:1, N: [100,95], D:0, C:0}))
        this.ok(equal(newData[1], {from: "2015-10-06", to: "2015-10-11", S: 100*1000*.6, W:1, N: [95,90], D:0, C:0}))
        this.ok(equal(newData[2], {from: "2015-10-11", to: "2015-10-21", S: 100*1000*.7, W:.5, N: [90,80], D:0, C:0}))
        this.ok(equal(newData[3], {from: "2015-10-21", to: "2015-10-31", S: 100*1000*.8, W:.5, N: [80,70], D:1000, C:900}))
        this.ok(equal(newData[4], {from: "2015-10-31", to: "2015-11-08", S: 100*1000*.9, W:.5, N: [70,68], D:0, C:900}))
        this.ok(equal(newData[5], {from: "2015-11-08", to: "2015-11-09", S: 100*1000*.9, W:.5, N: [68,68], D:1000, C:0}))
        this.ok(equal(newData[6], {from: "2015-11-09", to: "2015-11-15", S: 100*1000, W:.5, N: [68,68], D:0, C:0}))
        //this.log(newData)

    })

    this.test("calculateShares", function(t) {
        var item = {from: "2015-10-21", to: "2015-10-31", N:[11, 1], W:.5, C: 11, D:12, S:100}

        var result = pie.calculateShares("2015-10-21", "2015-10-31", item, true)
        this.eq(result, (11+10+9+8+7+6+5+4+3+2)*(.5*100/365) + 11*(11 + 12 /0.6))

        result = pie.calculateShares("2015-10-26", "2015-10-30", item, false)
        this.eq(result, (6+5+4+3) * (.5*100/365))
    })

    this.test("sumShares", function() {
        var data = [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: [100,90], D:0, C:0},
            {from: "2015-10-11", to: "2015-10-21", S: 75*1000, W:1.5, N: [90,80], D:0, C:0},
            {from: "2015-10-21", to: "2015-11-01", S: 75*1000, W:1.5, N: [80,69], D:2000, C:0},
            {from: "2015-11-01", to: "2015-11-06", S: 75*1000, W:0.75, N: [69,64], D:0, C:9000},
            {from: "2015-11-06", to: "2015-11-11", S: 75*1000, W:0.75, N: [64,59], D:0, C:0},
            {from: "2015-11-11", to: "2015-11-15", S: 75*1000, W:2, N: [59,55], D:0, C:0}
        ]

        var result = pie.sumShares(data, '2015-10-05', '2015-11-13')

        this.eq(result,
           //Salary/365 *      N   * days *W   + N * D   /.6
            100*1000/365*(96+91)/2*6 +
            75*1000/365 *(90+81)/2 *10   *1.5  +
            75*1000/365 *(80+70)/2 *11   *1.5  + 80*2000/.6  +
            75*1000/365 *(69+65)/2 *5    *.75  + 69*9000 +
            75*1000/365 *(64+60)/2 *5    *.75  +
            75*1000/365 *(59+58)/2 *2    *2)
    })

    this.test("sumManHours", function() {
        var data = [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1,   N: [100,90], D:0, C:0},
            {from: "2015-10-11", to: "2015-10-21", S: 75*1000, W:1.5,  N: [90, 80], D:0, C:0},
            {from: "2015-10-21", to: "2015-11-01", S: 75*1000, W:1.5,  N: [80, 69], D:2000, C:0},
            {from: "2015-11-01", to: "2015-11-06", S: 75*1000, W:0.75, N: [69, 64], D:0, C:900},
            {from: "2015-11-06", to: "2015-11-11", S: 75*1000, W:0.75, N: [64, 59], D:0, C:0},
            {from: "2015-11-11", to: "2015-11-15", S: 75*1000, W:2,    N: [59, 55], D:0, C:0}
        ]

        var result = pie.sumManHours(data, '2015-10-05', '2015-11-13')
        this.eq(result, 6+1.5*10+1.5*11 +.75*5 +.75*5+2*2)
    })

    this.test("summary", function(t) {
        var N = {
            '2015-11-06': 1,
            '2016-06-01':.5
        }
        var personOne = {
            '2015-10-01': {S:100*1000, W:1},    // nonexistent in personTwo
            '2015-10-11': {W:.5},               // identical range in personTwo
            '2015-10-21': {D: 1000},
            '2015-11-11': {W: 1}
        }
        var personTwo = {
            '2015-10-11': {S:50*1000, W:1},
            '2015-10-21': {C: 900},
            '2015-11-01': {W:.25},              // range starts the same, but ends different from personTwo
            '2015-11-11': {W: 1}                // range ends the same, but starts different from personTwo
        }

        // 10-01 - 10-11, 10-11 - 10-21, 10-21 - 11-01, 11-01 - 11-06, 11-06 - 11-11, 11-11 - 11-15

        var person1 = pie.normalizePersonalEquity(N, personOne, '2015-10-01', '2015-11-15')
        var person2 = pie.normalizePersonalEquity(N, personTwo, '2015-10-01', '2015-11-15')
        var totals = pie.total([person1, person2])

        var result = pie.summary(person1, totals)

        var Nat = function(at) {
            return calculateN("2015-10-01",'2015-11-06',50,1,at)
        }
        var averageN = function(from,to) {
            return (Nat(from)+Nat(to))/2
        }

        var totalOne1001to1011 = 100*k/365*averageN("2015-10-01","2015-10-10")*10
        var fracOne1001to1011 = 1

        var N1011to21 = averageN("2015-10-11","2015-10-20")
        var totalOne1011to1021 = totalOne1001to1011+100*k/365*N1011to21*10*.5, total2B = 50*k/365*N1011to21*10
        var fracOne1011to1021 = totalOne1011to1021/(totalOne1011to1021+total2B), fraction2B = total2B/(totalOne1011to1021+total2B)

        var N1021to1106 = averageN("2015-10-21","2015-11-05"), N1021 = Nat("2015-10-21")
        var N1021to1101 = averageN("2015-10-21","2015-10-31"), N1101to1106 = averageN("2015-11-01","2015-11-05")
        var total1C = totalOne1011to1021+100*k/365*N1021to1106*16*.5+N1021*1000/.6, total2_1021to1106 = total2B + 50*k/365*N1021to1101*11 + N1021*900 + 50*k/365*N1101to1106*5*.25
        var fraction1C = total1C/(total1C+total2_1021to1106)
        var total2C = total2B+50*k/365*N1021to1101*11*1+N1021*900, total1_1021to1101 = totalOne1011to1021+100*k/365*N1021to1101*11*.5+N1021*1000/.6
        var fraction2C = total2C/(total2C+total1_1021to1101)

        var Nat = function(at) {
            return calculateN("2015-11-06",'2016-06-01',1,.5,at)
        }

        var N1106to1111 = averageN("2015-11-06","2015-11-10")
        var total1D = total1C + 100*k/365*N1106to1111*5*.5, total2_1106to1111 = total2_1021to1106 + 50*k/365*N1106to1111*5*.25
        var fraction1D = total1D/(total1D+total2_1106to1111)
        //var actualFraction1D = 0.6311130781146269

        var total2D = total2C + 50*k/365*N1101to1106*5*.25, total1_1101to1106 = total1_1021to1101+100*k/365*N1101to1106*5*.5
        var fraction2D = total2D/(total2D+total1_1101to1106)

        var N1111to1115 = averageN("2015-11-11","2015-11-14")
        var total1E = total1D + 100*k/365*N1111to1115* 4, total2F = total2_1106to1111 + 50*k/365*N1111to1115*4
        var fraction1E = total1E/(total1E+total2F), fraction2E = total2_1106to1111/(total1E+total2_1106to1111)

        var fraction2F = total2F/(total2F+total1E)

        var item = function(item) {
            t.ok(close(result[index], item,.01), result[index], item); index++
        }

        this.eq(result.length, 5)
        var index = 0
        item({from:"2015-10-01",to:"2015-10-11", S:100*k,W:1, D:0,C:0, N: calculateNRange("2015-10-01",'2015-11-06',50,1,"2015-10-01","2015-10-11"),
            runningTotal:totalOne1001to1011, runningFraction: fracOne1001to1011})
        item({from:"2015-10-11",to:"2015-10-21", S:100*k,W:.5, D:0,C:0, N: calculateNRange("2015-10-01",'2015-11-06',50,1,"2015-10-11","2015-10-21"),
            runningTotal:totalOne1011to1021, runningFraction: fracOne1011to1021})
        item({from:"2015-10-21",to:"2015-11-06", S:100*k,W:.5, D:1000,C:0, N: calculateNRange("2015-10-01",'2015-11-06',50,1,"2015-10-21","2015-11-06"),
            runningTotal:total1C, runningFraction: fraction1C})
        //this.ok(fraction1D -.0001 <= actualFraction1D&&actualFraction1D <= fraction1D +.0001) // should be really close
        item({from:"2015-11-06",to:"2015-11-11", S:100*k,W:.5, D:0,C:0, N: calculateNRange("2015-11-06",'2016-06-01',1,.5,"2015-11-06","2015-11-11"),
            runningTotal:total1D, runningFraction: fraction1D})
        item({from:"2015-11-11",to:"2015-11-15", S:100*k,W:1, D:0,C:0, N:calculateNRange("2015-11-06",'2016-06-01',1,.5,"2015-11-11","2015-11-15"),
            runningTotal:total1E, runningFraction: fraction1E})

        result = pie.summary(person2, totals)
        this.eq(result.length, 5)
        index = 0
        item({from:"2015-10-11",to:"2015-10-21", S:50*k,W:1, D:0,C:0, N:calculateNRange("2015-10-01",'2015-11-06',50,1,"2015-10-11","2015-10-21"),
            runningTotal:total2B, runningFraction: fraction2B})
        item({from:"2015-10-21",to:"2015-11-01", S:50*k,W:1, D:0,C:900, N:calculateNRange("2015-10-01",'2015-11-06',50,1,"2015-10-21","2015-11-01"),
            runningTotal:total2C, runningFraction: fraction2C})
        item({from:"2015-11-01",to:"2015-11-06", S:50*k,W:.25, D:0,C:0, N:calculateNRange("2015-10-01",'2015-11-06',50,1,"2015-11-01","2015-11-06"),
            runningTotal:total2D, runningFraction: fraction2D})
        item({from:"2015-11-06",to:"2015-11-11", S:50*k,W:.25, D:0,C:0, N:calculateNRange("2015-11-06",'2016-06-01',1,.5,"2015-11-06","2015-11-11"),
            runningTotal:total2_1106to1111, runningFraction: fraction2E})
        item({from:"2015-11-11",to:"2015-11-15", S:50*k,W:1, D:0,C:0, N:calculateNRange("2015-11-06",'2016-06-01',1,.5,"2015-11-11","2015-11-15"),
            runningTotal:total2F, runningFraction: fraction2F})
    })

    this.test("former bugs", function() {
        this.test("total - negative date range", function(t) {

            var personData = [
                [   { from: moment('2014-01-01'),S: 138,W: 0.25,D: 0,C:0, to: moment('2014-01-16'),N: [100,90] },
                    { from: moment('2014-01-16'),S: 173,W: 0.25,D: 0,C:0,to:  moment('2014-01-31'),N: [100,90] },
                    { from: moment('2014-01-31'),S: 345,W: 0.25,D: 20,C:0,to: moment('2015-10-14'),N: [100,90] }
                ],[
                    { from: moment('2015-02-19'),S: 44000,W: 0.125,D:0,C:0,to:  moment('2015-03-06'),N: [100,90] },
                    { from: moment('2015-03-06'),S: 88000,W: 0.125,D:0,C:0,to:  moment('2015-05-05'),N: [100,90] },
                    { from: moment('2015-05-05'),S: 110000,W: 0.125,D:0,C:0,to: moment('2015-10-14'),N: [100,90] }
                ]
            ]

            var results = pie.total(personData)
            results.forEach(function(result) {
                if(moment(result.to).isBefore(moment(result.from))) {
                    t.ok(false)
                }
            })
        })

        this.test("total - Object 2015-02-25 has no method 'diff' in splitRange", function() {

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


// compares arrays and objects for value equality (all elements and members must match)
// matching numbers compares approximately - numbers must be within the 'closeness' to be considered equal enough
function close(a,b, closeness) {
    if(a instanceof Array) {
        if(!(b instanceof Array))
            return false
        if(a.length !== b.length) {
            return false
        } else {
            for(var n=0; n<a.length; n++) {
                if(!close(a[n],b[n], closeness)) {
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

                if(!close(aVal,bVal, closeness)) {
                    return false
                }
            }
            // else
            return true
        }
    } else {
        if(typeof(a) === 'number') {
            return aproxEq(a,b,closeness)
        } else {
            return a===b || Number.isNaN(a) && Number.isNaN(b)
        }
    }
}

function calculateN(tprev, tnext, Nprev, Nnext, x) {
    return Nprev - (moment(x).diff(moment(tprev),'days'))*(Nprev - Nnext)/(moment(tnext).diff(moment(tprev),'days'))
}

function calculateNRange(tprev, tnext, Nprev, Nnext, from, to) {
    return [calculateN(tprev,tnext, Nprev,Nnext, from), calculateN(tprev,tnext, Nprev,Nnext, to)]
}

function aproxEq(a,b, closeness) {
    if(closeness === undefined) closeness = .0001
    return b -closeness <= a&&a <= b +closeness
}