var request = require('request');
var pubsub = require('@google-cloud/pubsub');
var ApiAiAssistant = require('actions-on-google').ApiAiAssistant;

var pubsubClient = pubsub({ projectId: 'genuine-quasar-141612' });
const topicName = 'MMM';

const drinksData = {"Ingredients":["Strawberry Daiquiri Mix","Passion Fruit Martini Mix","Vodka","White Rum","Tequila","Orange Juice","Blue Curacao"],"Cocktails":{"Hole In One":{"ingredients":{"Vodka":1.5,"Cranberry Juice":3,"Orange Juice":0.125},"glass":"Large Martini"},"Grand Cosmo":{"ingredients":{"Vodka":1.5,"Grand Marnier":1,"Lime Juice":"a splash","Cranberry Juice":2},"glass":"Large Martini"},"Ghost Goblet":{"ingredients":{"Cranberry Juice":8,"Vodka":4,"Cointreau":2},"glass":"Large Martini"},"Tequila Sunrise":{"ingredients":{"Orange Juice":4,"Tequila":2,"Grenadine":0.5},"glass":"Highball"},"Bocce Ball":{"ingredients":{"Orange Juice":4,"Vodka":2,"Disaronno":1},"glass":"Highball"},"Ollie":{"ingredients":{"White Rum":1,"Vodka":2,"Tequila":1,"Lemonade":-1},"glass":"Highball","instructions":"Drink like a tequila slammer, holding a slice of lemon between your thumb and forefinger of one hand, a pinch of salt resting on the back of the same hand. Lick up the salt, down the drink in one and then bite the slice of lemon."},"Romeo":{"ingredients":{"White Rum":1.25,"Cointreau":1,"Lemon Juice":"a generous splash","Strawberry Puree":3},"glass":"14oz Bulb"},"Orange Crush":{"ingredients":{"Vodka":2,"Orange Liqueur":1,"Orange Juice":3},"glass":"Collins","instructions":"Don't forget to garnish with orange!"},"Black Cat":{"ingredients":{"Tequila":1.25,"Disaronno":1.25},"glass":"Lowball"},"Soylent Green":{"ingredients":{"Vodka":1.5,"Blue Curacao":1,"Orange Juice":4},"glass":"Collins"},"Tropical Itch":{"ingredients":{"Vodka":1,"Grand Marnier":0.5,"White Rum":1,"Passion Fruit Juice":3},"glass":"Collins"},"Screwdriver":{"ingredients":{"Vodka":1.5,"Orange Juice":4},"glass":"Lowball"},"Kamikaze":{"ingredients":{"Vodka":0.5,"Triple Sec":0.25,"Lime Juice":0.25},"glass":"Shot"},"Godmother":{"ingredients":{"Vodka":1.5,"Disaronno":0.5},"glass":"Lowball"}},"Substitutions":{"Grand Marnier":"Blue Curacao","Cointreau":"Blue Curacao","Grenadine":"Blue Curacao","Strawberry Puree":"Strawberry Daiquiri Mix","Orange Liqueur":"Blue Curacao","Passion Fruit Juice":"Passion Fruit Martini Mix","Triple Sec":"Blue Curacao"}}
const drinks = Object.getOwnPropertyNames(drinksData.Cocktails)
var shuffled_drinks = drinks
var extras = ["Lime Juice","Lemon Juice","Lemonade","Sugar"]

var busy = false
var current_rec_pos = 0
var response = {}

exports.run = function (req, res) {
  
  res.set('Content-Type', 'application/json')
  response = {
    "displayText":"",
    "contextOut":[],
    "data": {}
  }

  handle(req.body.result,res)

}

//And now for some functions...

function handle(result,res){
  switch(result.action){

    case "drink_request":
      makeDrink(result.parameters.Drink,res)
      break

    case "surprise_drink":
      var index = Math.floor(Math.random()*drinks.length)
      makeDrink(drinks[index])

    case "recommend_drink":
      recommend(res)
      break

    case "next_rec":
      nextRec(res)
      break

    case "get_recipe":
      getRecipe(result.parameters,res)
      break

    case "add_extra":
      extras.push(result.parameters.Drink)
      res.send(response)
      console.log(extras)
      break

    case "remove_extra":
      var index = extras.indexOf(result.parameters.Drink)
      if(index > -1){
        extras.splice(index,1)
      }
      res.send(response)
      break

    case "clear_extras":
      extras = []
      break

    case "finished":
      busy = false
      break

    //Add more cases for different actions here

    default:
      console.log("yer what m8")
  }
}

function makeDrink(drinkName,res){
  if(!busy){
    console.log("Making a",drinkName)
    var recipe = drinksData.Cocktails[drinkName].ingredients
    var plain_needed = Object.getOwnPropertyNames(recipe)
    var subbed_needed = plain_needed.map(function(val){
      if(drinksData.Substitutions[val] == undefined){
        return val
      } else {
        return drinksData.Substitutions[val]
      }
    })
    var toPour = subbed_needed.filter(function(x){return drinksData.Ingredients.indexOf(x) > -1})
    var toAdd  = subbed_needed.filter(function(x){return extras.indexOf(x) > -1})
    console.log(recipe,plain_needed,subbed_needed,toPour,toAdd,extras)
    if(toPour.length + toAdd.length < plain_needed.length){
      response["speech"] = "Sorry, we don't have all the ingredients for that drink."
      var pubData = {
        'action' : "flash_unavailable"
      }
    } else {
      if(toAdd.length > 0){
        var done_msg = "Make sure you "
        toAdd.forEach(function(v,i,a){ 
          var amount = recipe[plain_needed[subbed_needed.indexOf(v)]]
          if(amount == -1){
            msg += "top up your glass with " + v
          } else {
            msg += "add " + amount + " of " + v
          }
        })
      } else {
        done_msg = ""
      }
      response["speech"] = "Place a " + drinksData.Cocktails[drinkName].glass + " glass and await your drink."
      var pourList = {}
      for(var i = 0; i < subbed_needed.length; i++){
        pourList[subbed_needed[i]] = recipe[plain_needed[i]]
      }
      var pubData = {
        'action' : "make_drink",
        'doneMsg': done_msg,
        'toPour' : pourList
      }
    }
  } else {
    response["speech"] = "Sorry I'm busy right now"
    var pubData = {
      'action' : "flash_busy"
    }
  }
  createTopic(function(topic){
    publishMessage(topic,pubData,function(){})
  })
  res.send(response)
}

function recommend(res){
  console.log("Shuffling list")
  shuffled_drinks = shuffle(shuffled_drinks)
  current_rec_pos = -1
  nextRec(res)
}

function nextRec(res){
  current_rec_pos++
  if(current_rec_pos >= drinks.length){
    response["speech"] = "Sorry, that's all the drinks I know how to make"
  } else {
    response["speech"] = ivegota() + shuffled_drinks[current_rec_pos]
    response["contextOut"] = [{
      "name":"recommended",
      "lifespan":4,
      "parameters":{"Drink":shuffled_drinks[current_rec_pos]}
    }]
  }
  res.send(response)
}

function getRecipe(args,res){
  var drink = args.Drink
  console.log("Getting recipe for",drink)
  var list = Object.getOwnPropertyNames(drinksData.Cocktails[drink].ingredients)
  if(list != undefined){
    list = list.join(", ").replace(/,([^,]*)$/," and"+'$1')
    response["speech"] = ingredients(drink) + list
  }
  res.send(response)
  console.log("Sent ",response)
}

//And here come the helper functions...
function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function ivegota(){
  var choices = [
    "I've got a ",
    "You could try a ",
    "How about a ",
    "Would you like a ",
    "I could do you a ",
    "There's a ",
    "Well there's a "
  ]
  var index = Math.floor(Math.random()*choices.length)
  return choices[index]
}

function ingredients(drink){
  var A = ["A ","You make a ","To make a "]
  var B = [" contains "," with "," you use "]
  var index = Math.floor(Math.random()*A.length)
  return A[index] + drink + B[index]

}

//And now some pubsub functions

function createTopic(callback) {
  if (!callback) {
    console.log('no callback');
    return;
  }
  pubsubClient.createTopic(topicName, function(error, topic) {
    // topic already exists
    if (error && error.code === 409) {
      console.log('topic created');
      // callback(topic);
      callback(pubsubClient.topic(topicName));
      return;
    }
    if (error) {
      console.log(error);
      return;
    }
    callback(pubsubClient.topic(topicName));
  });
}

function publishMessage(topic, message, callback) {
  topic.publish(message, function(error) {
    if (error) {
      console.log('Publish error:');
      console.log(error);
      return;
    }
    console.log('publish successful');
    if (callback) {
      callback();
    }
  });
}