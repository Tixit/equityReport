"use strict";

var Unit = require('deadunit')
var pie = require('../pieReport')

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
        this.ok(equal(result, [
            {from: "2015-10-01", to: "2015-10-11", S: 100*1000, W:1, N: 100, D:0},
            {from: "2015-10-11", to: "2015-10-21", S: 75*1000, W:1.5, N: 100, D:0},
            {from: "2015-10-21", to: "2015-11-01", S: 75*1000, W:1.5, N: 100, D:2000},
            {from: "2015-11-01", to: "2015-11-06", S: 75*1000, W:0.75, N: 100, D:0},
            {from: "2015-11-06", to: "2015-11-11", S: 75*1000, W:0.75, N: 25, D:0},
            {from: "2015-11-11", to: "2015-11-15", S: 75*1000, W:2, N: 25, D:0}
        ]), result)
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
        this.log(newData)

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