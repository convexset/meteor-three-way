/* global ThreeWay: true */
/* global GuideData: true */
/* global getRandomId: true */
/* global Fake: true */

var happySayings = [
	"“We must accept finite disappointment, but we must never lose infinite hope.” – Martin Luther King",
	"“The friend in my adversity I shall always cherish most. I can better trust those who helped to relieve the gloom of my dark hours than those who are so ready to enjoy with me the sunshine of my prosperity.” – Ulysses S. Grant",
	"“We must embrace pain and burn it as fuel for our journey.” – Kenji Miyazawa",
	"“Fall seven times, stand up eight.” – Japanese Proverb",
	"“Sometimes our light goes out, but is blown again into instant flame by an encounter with another human being.” – Albert Schweitzer",
	"“We should always pray for help, but we should always listen for inspiration and impression to proceed in ways different from those we may have thought of.” – John H. Groberg",
	"“A problem is a chance for you to do your best.” – Duke Ellington",
	"“When everything seems to be going against you, remember that the airplane takes off against the wind, not with it.” – Henry Ford59",
	"“The gem cannot be polished without friction, nor man perfected without trials.” – Chinese Proverb",
	"“Obstacles don’t have to stop you. If you run into a wall, don’t turn around and give up. Figure out how to climb it, go through it, or work around it.” – Michael Jordan",
	"“The greater the difficulty, the more glory in surmounting it. Skillful pilots gain their reputation from storms and tempests.” – Epicetus",
	"“Problems are not stop signs, they are guidelines.” – Robert Schuller",
	"“Prosperity is a great teacher; adversity is a greater. Possession pampers the mind; privation trains and strengthens it.” – William Hazlitt",
	"“Prosperity is not without many fears and disasters; and adversity is not without comforts and hopes.” – Francis Bacon",
	"“Hope is important because it can make the present moment less difficult to bear. If we believe that tomorrow will be better, we can bear a hardship today.” – Thich Nhat Hanh53",
	"“Never let your head hang down. Never give up and sit down and grieve. Find another way. And don’t pray when it rains if you don’t pray when the sun shines.” – Leroy Satchel Paige",
	"“The difference between stumbling blocks and stepping stones is how you use them.” – Unknown",
	"“Next to trying and winning, the best thing is trying and failing.” – L.M. Montgomery",
	"“Just as despair can come to one only from other human beings, hope, too, can be given to one only by other human beings.” – Elie Weisel",
	"“The greatest glory in living lies not in never failing, but in rising every time we fail.” – Nelson Mandela",
	"“In times of great stress or adversity, it’s always best to keep busy, to plow your anger and your energy into something positive.” – Lee Iacocca",
	"“It is only in our darkest hours that we may discover the true strength of the brilliant light within ourselves that can never, ever, be dimmed.” – Doe Zantamata",
	"“Tough times never last, but tough people do.” – Robert H Schuller",
	"“If it’s not exactly like you thought it would be, you think it’s a failure. What about the spectrum of colors in between.” – Sara Evans",
	"“Use what you’ve been through as fuel, believe in yourself and be unstoppable!” – Yvonne Pierre",
	"“I learned there are troubles of more than one kind. Some come from ahead, others come from behind. But I’ve bought a big bat. I’m all ready, you see. Now my troubles are going to have trouble with me.” – Dr. Seuss",
	"“In three words I can sum up everything I’ve learned about life. It goes on.” – Robert Frost",
	"“Prosperity makes friends, adversity tries them.” – Publilius Syrus",
	"“Every adversity, every failure and every heartache carries with it the seed of an equivalent or a greater benefit.” – Napoleon Hill",
	"“If you don’t like something change it; if you can’t change it, change the way you think about it.” – Mary Engelbreit",
	"“Courage doesn’t always roar. Sometimes courage is the quiet voice at the end of the day, saying, “I will try again tomorrow.” – Mary Anne Radmacher",
	"“Believe that life is worth living and your belief will help create the fact.” – William James",
	"“Have great hopes and dare to go all out for them. Have great dreams and dare to live them. Have tremendous expectations and believe in them.” – Norman Vincent Peale",
	"“Things turn out the best for the people who make the best of the way things turn out.” - John Wooden",
	"“The best way to get rid of the pain is to feel the pain. And when you feel the pain and go beyond it, you’ll see there’s a very intense love that is wanting to awaken itself.” – Deepak Chopra",
	"“To have darkness behind me, in front of me a bright sky, flickering lights on the water and to feel it on the stony face of the southern sun.” – Julia Hartwig",
	"“Even if happiness forgets you a little bit, never completely forget about it.” – Jacques Prevert",
	"“Man is fond of counting his troubles but he does not count his joys. If he counted them up, as he ought to, he would see that every lot has enough happiness provided for it.” – Fyodor Dostoevsky",
	"“It doesn’t matter how slow you go, as long as you don’t stop.” – Confucius",
	"“Learn how to be happy with what you have while you pursue all that you want.” – Jim rohn",
	"“You are today where your thoughts have brought you; you will be tomorrow where your thoughts take you.” – James Allen",
	"“To succeed, you have to do something and be very bad at it for a while. You have to look bad before you can look really good.” – Barbara DeAngelis",
	"“The bravest sight in the world is to see a great man struggling against adversity.” – Seneca",
	"“I ask not for a lighter burden, but for broader shoulders.” – Jewish Proverb",
	"“When things are bad, we take comfort in the thought that they could always get worse. And when they are, we find hope in the thought that things are so bad they have to get better.” – Malcolm S. Forbes",
	"“He knows not his own strength who hath not met adversity.” – William Samuel Johnson",
	"“I will love the light for it shows me the way, yet I will endure the darkness for it shows me the stars.” – Og Mandino",
];

ThreeWay.prepare(Template.ThreeWayGuide_Events, {
	viewModelToViewOnly: {
		logText: "Logged messages will appear here.\n\n",
		sliderR: Math.floor(16 + 224 * Math.random()),
		sliderG: Math.floor(16 + 224 * Math.random()),
		sliderB: Math.floor(16 + 224 * Math.random()),
	},
	preProcessors: {
		toRGB: function(r, g, b) {
			return '#' + [r, g, b].map(x => Number(x).toString(16)).join('');
		},
		toInvRGB: function(r, g, b) {
			return '#' + [r, g, b].map(x => (255 - Number(x)).toString(16)).join('');
		},
	},
	eventHandlers: {
		dragStartHandler: function(event, template, vmData) {
			var newLogText = vmData.logText;
			var dataBindString = event.target.getAttribute('data-bind');
			newLogText += "Drag Start at " + (new Date()) + " [" + dataBindString + "]" + '\n\n';
			template._3w_.set('logText', newLogText);
			setTimeout(function() {
				var textarea = template.$('textarea')[0];
				textarea.scrollTop = textarea.scrollHeight;
			}, 50);
		},
		dragEndHandler: function(event, template, vmData) {
			var newLogText = vmData.logText;
			var dataBindString = event.target.getAttribute('data-bind');
			newLogText += "Drag End at " + (new Date()) + " [" + dataBindString + "]" + '\n\n';
			template._3w_.set('logText', newLogText);
			setTimeout(function() {
				var textarea = template.$('textarea')[0];
				textarea.scrollTop = textarea.scrollHeight;
			}, 50);
		},
		saySomethingHappy: function(event, template, vmData) {
			var newLogText = vmData.logText;
			newLogText += Fake.fromArray(happySayings) + '\n\n';
			template._3w_.set('logText', newLogText);
			setTimeout(function() {
				var textarea = template.$('textarea')[0];
				textarea.scrollTop = textarea.scrollHeight;
			}, 50);
		},
		clearLogOnX: ThreeWay.eventGenerators.keypressHandlerGeneratorFromChars(function(event, template) {
			template._3w_.set('logText', '');
		}, 'x'),
		invertColors: function(event, template, vmData) {
			['R', 'G', 'B'].forEach(c => template._3w_.set('slider' + c, (255 - vmData['slider' + c]).toString()));
		},
	}
});

ThreeWay.prepare(Template.ThreeWayGuide_DataValidation, {
	collection: GuideData.collection,
	updatersForServer: {
		'name': 'three-way-guide/update/name',
		'tags': 'three-way-guide/update/tags',
		'someArray': 'three-way-guide/update/someArray',
		'someArray.*': 'three-way-guide/update/someArray.*',
	},
	dataTransformToServer: {
		tags: ThreeWay.transformations.arrayFromCommaDelimitedString,
	},
	dataTransformFromServer: {
		tags: ThreeWay.transformations.arrayToCommaDelimitedString,
	},
	viewModelToViewOnly: {
		someArrayValidationErrorText: '',
		tagsValidationErrorText: '',
	},
	validatorsVM: {
		tags: {
			validator: function(value, matchInformation, vmData) {
				console.info('tags data at view model validation stage:', value);
				return true;
			},
		},
		"someArray.*": {
			validator: function(value, matchInformation, vmData) {
				// tags must begin with "tag"
				// more convenient to validate this here
				return !Number.isNaN(Number(value));
			},
			success: function(value, matchInformation, vmData) {
				var instance = this;
				instance._3w_.set('someArrayValidationErrorText.' + matchInformation.params[0], '');
			},
			failure: function(value, matchInformation, vmData) {
				var instance = this;
				console.error('[Validation Error|someArray.*] Match Information:', matchInformation);
				instance._3w_.set('someArrayValidationErrorText.' + matchInformation.params[0], 'Please enter only numbers. (See console for an example of \"match information\".)');
			},
		},
	},
	validatorsServer: {
		tags: {
			validator: function(value, matchInformation, vmData) {
				// tags must begin with "tag"
				// more convenient to validate this here
				console.info('tags data at pre-server validation stage:', value);
				return value.filter(x => x.substr(0, 3).toLowerCase() !== 'tag').length === 0;
			},
			success: function(value, matchInformation, vmData) {
				var instance = this;
				instance._3w_.set('tagsValidationErrorText', '');
			},
			failure: function(value, matchInformation, vmData) {
				var instance = this;
				instance._3w_.set('tagsValidationErrorText', 'Each tag should begin with \"tag\".');
			},
		},
	},
	validateRepeats: false, // (default: false)
	preProcessors: {
		redIfTrue: x => (!!x) ? "red" : "",
	}
});

Template.ThreeWayGuide_DataValidation.onCreated(function() {
	var instance = this;
	instance.subscribe('guide-pub');
});

Template.ThreeWayGuide_DataValidation.onRendered(function() {
	var instance = this;

	instance.autorun(function() {
		var id = getRandomId(instance);
		if (!!id) {
			instance._3w_.setId(id);
		}
	});

	instance.$('.ui.dropdown')
		.dropdown({
			allowAdditions: true
		});
});

Template.ThreeWayGuide_DataValidation.helpers(GuideData.helperBundle);

Template.ThreeWayGuide_DataValidation.events({
	'click button.select-document': function(event, instance) {
		var id = event.target.getAttribute('data-id');
		if (!!id) {
			instance._3w_.setId(id);

			setTimeout(function() {
				$('html, body').animate({
					scrollTop: Math.max(0, instance.$("table.edit-table").offset().top - 120)
				}, 500);
			}, 50);
		}
	}
});