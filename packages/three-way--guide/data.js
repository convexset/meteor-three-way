/* global GuideData: true */
/* global DataRecord: true */

DataRecord = function DataRecord(doc) {
    _.extend(this, doc);
};

DataRecord.prototype = {
    cleanPoints: function() {
        var clean = v => ((typeof v === "undefined") || (Number.isNaN(Number(v)))) ? (Math.random() * 2 - 1) : Number(v);
        return this.points.map(function(p) {
            return {
                x: clean(p.x),
                y: clean(p.y)
            };
        });
    },
    bounds: function() {
        var points = this.cleanPoints();
        return _.object(['x', 'y']
            .map(c => [c, points.map(x => x[c])])
            .map(z => [z[0],
                [Math.min.apply({}, z[1]), Math.max.apply({}, z[1])]
            ])
        );
    },
};

GuideData = {
    collection: new Mongo.Collection('data-guide', {
        transform: (doc) => new DataRecord(doc)
    }),
    fields: [
        'name',
        'emailPrefs',
        'age',
        'notes',
        'tags',
        'someArr.*',
        'points.*.*',
    ],
    allTags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    ageRanges: {
        '0_12': '0 to 12',
        '13_20': '13 to 20',
        '21_35': '21 to 35',
        '36_65': '36 to 65',
        '66_plus': '66 and over',
    },
    emailPrefsAll: {
        'opt1': 'Spam Away',
        'opt2': 'Only My Orders',
        'opt3': 'Don\'t',
    },
};