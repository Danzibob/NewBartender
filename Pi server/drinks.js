/*
Cocktail List:
	Strawberry Daiquiri
	Pornstar Martini
	Cherry Bakewell 				
	Godmother 						✔
	Kamikaze 		(Lemon Juice)	✔
	Screwdriver						✔
	Tropical Itch 	[Passion Juice] -> That paste shizz
	Soylent Green 					✔
	Black Cat 						✔
	Orange Crush	(Garnish)		✔
	Romeo 			(Lemon Juice) [Strawberry Puree] -> That other paste shizz
	The Ollie 		(Lemonade)		✔
	Bocce Ball 		[]				✔
	Tequila Sunrise [Grenadine]		-> Blue Curacao
	Ghost Goblet	[Cointreau] 	-> Blue Curacao
	Grand Cosmo 	[Grand Marnier] -> Blue Curacao
	Hole in one 	[Dry Vermouth]	X
*/

module.exports = {
	"Ingredients":[
		'Strawberry Daiquiri Mix',
		'Passion Fruit Martini Mix',
		'Vodka',
		'White Rum',
		//'Disaronno',
		'Tequila',
		'Orange Juice',
		'Blue Curacao'
	]

	"Cocktails":{

		'Hole In One':{
			'ingredients': {
				'Vodka':1.5,
				'Cranberry Juice':3,
				'Orange Juice':1/8
			},
			'glass': "Large Martini"
		},

		'Grand Cosmo':{
			'ingredients': {
				'Vodka':1.5,
				'Grand Marnier':1,
				'Lime Juice':1/8,
				'Cranberry Juice':2
			},
			'glass': "Large Martini"
		},

		'Ghost Goblet':{
			'ingredients': {
				'Cranberry Juice':8,
				'Vodka':4,
				'Cointreau':2
			},
			'glass': "Large Martini"
		},

		'Tequila Sunrise':{
			'ingredients': {
				'Orange Juice':4,
				'Tequila':2,
				'Grenadine':1/2
			},
			'glass': "Highball"
		}

		'Bocce Ball':{
			'ingredients': {
				'Orange Juice':4,
				'Vodka':2,
				'Disaronno':1
			},
			'glass': "Highball"
		},

		'Ollie':{
			'ingredients': {
				'White Rum':1,
				'Vodka':2,
				'Tequila':1,
				'Lemonade':-1
			},
			'glass': "Highball",
			'instructions':"Drink like a tequila slammer, holding a slice of lemon between your thumb and forefinger of one hand, a pinch of salt resting on the back of the same hand. Lick up the salt, down the drink in one and then bite the slice of lemon."
		},

		'Romeo':{
			'ingredients': {
				'White Rum':1+1/4,
				'Cointreau':1,
				'Lemon Juice':1/2,
				'Strawberry Puree':3
			},
			'glass': "14oz Bulb"
		},

		'Orange Crush':{
			'ingredients': {
				'Vodka':2,
				'Orange Liqueur':1,
				'Orange Juice':3
			},
			'glass': "Collins",
			'instructions':"Don't forget to garnish with orange!"
		},

		'Black Cat':{
			'ingredients': {
				'Tequila':1+1/4,
				'Disaronno':1+1/4
			},
			'glass': "Lowball"
		},

		'Soylent Green':{
			'ingredients': {
				'Vodka':1+1/2,
				'Blue Curacao':1,
				'Orange Juice':4
			},
			'glass': "Collins"
		},

		'Tropical Itch':{
			'ingredients': {
				'Vodka':1,
				'Grand Marnier':1/2,
				'White Rum':1,
				'Passion Fruit Juice':3
			},
			'glass': "Collins"
		},

		'Screwdriver':{
			'ingredients': {
				'Vodka':1+1/2,
				'Orange Juice':4
			},
			'glass': "Lowball"
		},

		'Kamikaze':{
			'ingredients': {
				'Vodka':1/2,
				'Triple Sec':1/4,
				'Lime Juice':1/4
			},
			'glass': "Shot"
		},

		'Godmother':{
			'ingredients': {
				'Vodka':1+1/2,
				'Disaronno':1/2
			},
			'glass': "Lowball"
		},



	},

	"Substitutions":{
		'Grand Marnier':"Blue Curacao",
		'Cointreau':"Blue Curacao",
		'Grenadine':"Blue Curacao",
		'Strawberry Puree': "Strawberry Daiquiri Mix",
		'Orange Liqueur': "Blue Curacao",
		'Passion Fruit Juice': "Passion Fruit Martini Mix",
		'Triple Sec':"Blue Curacao"
	}
}