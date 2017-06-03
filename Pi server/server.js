var express = require('express')
var bodyParser = require("body-parser")
const drinksData = require("./drinks.js")

const drinks = Object.getOwnPropertyNames(drinksData.Cocktails)
var busy = false
var current_rec_pos = 0
var response = {}

var app = express()
app.use(bodyParser.json())

app.post('/', function (req, res) {
  
  res.set('Content-Type', 'application/json')
  response = {
    "displayText":"",
    "contextOut":[],
    "data": {}
  }

  handle(req.body.result,res)

})
 
app.listen(3000)

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

    //Add more cases for different actions here

    default:
      console.log("yer what m8")
  }
}

function makeDrink(drinkName,res){
  if(!busy){
    console.log("Making a",drinkName)
    res.send(response)
    busy = true
    //Tell arduino the ingredients and amounts
    setTimeout(function() {busy = false}, 5000);
  } else {
    console.log("I can't I'm busy")
    response["speech"] = "Sorry I'm busy right now"
    res.send(response)
    //Flash lights red
  }
  
}

function recommend(res){
  console.log("Shuffling list")
  drinks = shuffle(drinks)
  current_rec_pos = -1
  nextRec(res)
}

function nextRec(res){
  current_rec_pos++
  if(current_rec_pos >= drinks.length){
    response["speech"] = "Sorry, that's all the drinks I know how to make"
  } else {
    response["speech"] = ivegota() + drinks[current_rec_pos]
    response["contextOut"] = [{
      "name":"recommended",
      "lifespan":2,
      "parameters":{"Drink":drinks[current_rec_pos]}
    }]
  }
  res.send(response)
}

function getRecipe(args,res){
  var drink = args.Drink
  console.log("Getting recipe for",drink)
  var list = drinksData[drink]
  if(list != undefined){
    list = list.join(", ").replace(/,([^,]*)$/," and"+'$1')
    response["speech"] = ingredients(drink) + list
  }
  res.send(response)
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