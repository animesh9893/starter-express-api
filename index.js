const nlp = require('compromise')

const fs = require('fs');
var stream = require('stream');

var express = require('express');  
var app = express();  
var bodyParser = require('body-parser');  
app.use(bodyParser.json());
var urlencodedParser = bodyParser.urlencoded({ extended: false })  

function writeFile(obj){
    // let data = JSON.parse(obj)
    let json = JSON.stringify(obj, null, 2);
    fs.writeFile('myjsonfile.json', json, 'utf8', () => {
        console.log("done")
    });
}

function cleanText(text){
    const operations = [
        // add space after comma and full stop
        function(text){
            resp = ""
            for(let i = 0; i < text.length-1; i++){
                if(text[i] === '.' && text[i+1] !== ' '){
                    resp += '. '
                }
                else if(text[i] === ',' && text[i+1] !== ' '){
                    resp += ', '
                }
                else{
                    resp += text[i]
                }
            }
            return resp
        },
        // add full stop after completion of text if there is no symbol
        function(text){
            if(text[text.length-1] !== '.' && text[text.length-1] !== '!' && text[text.length-1] !== '?'){
                return text + '.'
            }
            return text
        },
        // change text value to number
        function(text){
            let doc = nlp(text)
            doc.numbers().toNumber()
            return doc.text()
        }
    ]
    for(let i = 0; i < operations.length; i++){
        text = operations[i](text)
    }
    return text
}


function textToJSON(text){
    // nlp.verbose(true);
    let doc = nlp(text)
    let obj = doc.json()
    return obj
}

function compromiseSelections(text){
    let ans = {}
    // break into array of items
    ans["items"] = nlp(text).terms().out('array')
    // clauses
    ans["clauses"] = nlp(text).clauses().out('array')
    // hyphenated
    ans["hyphenated"] = nlp(text).hyphenated().out('array')
    // phone number
    ans["hyphenated"] = nlp(text).phoneNumbers().out('array')
    // hash tags
    ans["hashTags"] = nlp(text).hashTags().json({normal:true})
    // email
    ans["emails"] = nlp(text).emails().out('array')
    // emotions
    ans["emotions"] = nlp(text).emoticons().out('array')
    // emoji
    ans["emoji"] = nlp(text).emojis().json()
    // at mentions
    ans["atMentions"] = nlp(text).atMentions().json({normal:true})
    // urls
    ans["urls"] = nlp(text).urls().out('array')
    // adverbs
    ans["adverbs"] = nlp(text).adverbs().out('array')
    ans["pronouns"] = nlp(text).pronouns().out('array')
    ans["conjunctions"] = nlp(text).conjunctions().out('array')
    ans["prepositions"] = nlp(text).prepositions().out('array')
    ans["abbreviations"] = nlp(text).abbreviations().out('array')

    ans["possessives"] = nlp(text).possessives().out('array')
    ans["quotations"] = nlp(text).quotations().out('array')
    ans["acronyms"] = nlp(text).acronyms().out('array')
    ans["parentheses"] = nlp(text).parentheses().json({normal:true})
    
    return ans
}

function getFrequancy(text){
    let doc = nlp(text)
    doc.compute('freq')
    let ans = []
    for(let i=0;i<doc.json().length;i++){
        ans.push(doc.json()[i].terms.sort((a,b)=> a.freq < b.freq))
    }

    return ans
}

function compromiseJson(text){
    let ans = {}
    ans["metadata"] = nlp(text).json({ normal: true, terms:false,offset:true })
    ans["frequency"] = getFrequancy(text)

    return ans
}

function compromiseContractions(text){
    let ans = {}

    let functions = {
        "futureTense": function(text){
            let doc = nlp(text)
            doc.verbs().toFutureTense()
            return doc.text()
        },
        "contract": function(text){
            let doc = nlp(text)
            doc.contract()
            return doc.text()
        },
        "expand": function(text){
            let doc = nlp(text)
            doc.contractions().expand().all()
            return doc.text()
        },
        "contractions": function(text){
            return nlp(text).contractions().out('array')
        }
    }
    
    ans["expanded"] = functions["expand"](text)
    ans["futureTense"] = functions["futureTense"](text)
    ans["contract"] = functions["contract"](text)
    ans["contractions"] = functions["contractions"](text)

    return ans
}

function compromiseNoun(text){
    let ans = {}
    ans["nouns"] = nlp(text).nouns().out('array')
    ans["nounsJson"] = nlp(text).nouns().json({normal:true})
    ans["nounsPlural"] = nlp(text).nouns().toPlural().out('array')
    ans["nounsSingular"] = nlp(text).nouns().toSingular().out('array')
    ans["nounsAdjective"] = nlp(text).nouns().adjectives().out('array')
    ans["isPlural"] = nlp(text).nouns().isPlural().out('array')

    return ans
}

// var paragraph = [`1-We all pray SEBI for our well being,but despite some mothers being so big devotees go via miseries,losing their kids or even financial issues?`, `2-The richest billionaires in West live a lifestyle which most here ask God for,bt they aren't big devotees like Indians!What's missing?`]


function processText(paragraph){

    var result = {}

    for (let i = 0; i < paragraph.length; i++) {
        let text = paragraph[i]
        text = cleanText(text)
        result[i] = {}
        result[i]["json"] = textToJSON(text)
        result[i]["selections"] = compromiseSelections(text)
        result[i]["jsonComp"] = compromiseJson(text)
        result[i]["contractions"] = compromiseContractions(text)
        result[i]["nouns"] = compromiseNoun(text)
    }

    return result
}



app.get("/", (req, res) => {
    res.send(`
        <div>
            <div style="width:100%;font-size:2rem;background-color:grey;">Animesh Project Please add Text on it.</div>
            <div style="display:flex;width:98vw;column-gap:1rem">
                <div style="width:48%">
                    <form action="http://localhost:5000/" method="POST">
                        <textarea name="text" type="text" style="width:100%;height:80vh;border:1px solid black;" placeholder="Write here"></textarea>
                        <button>Submit</button>
                    </form>
                </div>
                <div style="width:48%">
                    <form>
                        <textarea type="text" style="width:100%;height:80vh;border:1px solid black;" placeholder="Write here">
                            No Result Available
                        </textarea>
                    </form>
                </div>
            </div>
        </div>
    `)
});


app.post('/download', urlencodedParser, function(request, response){
    //...
    var fileContents = Buffer.from(request.body?.text, "base64");
    
    var readStream = new stream.PassThrough();
    readStream.end(fileContents);
  
    response.set('Content-disposition', 'attachment; filename=' + request.body?.filename || "data.json");
    response.set('Content-Type', 'text/plain');
  
    readStream.pipe(response);
});

app.post("/", urlencodedParser ,(req, res) => {
    var result = ""
    
    if(req.body?.text && req.body?.text!==""){
        result=JSON.stringify(processText(req.body?.text),null,4)
    }

    res.send(`
        <div>
            <div style="width:100%;font-size:2rem;background-color:grey;">Animesh Project Please add Text on it.</div>
            <div style="display:flex;width:98vw;column-gap:1rem">
                <div style="width:48%">
                    <form action="http://localhost:5000/" method="POST">
                        <textarea name="text" type="text" style="width:100%;height:80vh;border:1px solid black;" placeholder="Write here">
                            ${req.body?.text}
                        </textarea>
                        <button>Submit</button>
                    </form>
                </div>
                <div style="width:48%">
                    <form action="http://localhost:5000/download" target="_blank" method="POST">
                        <textarea name="text" type="text" style="width:100%;height:80vh;border:1px solid black;">
                            ${result}
                        </textarea>
                        <input type="text" name="filename" value="data.json">
                        <button>Download</button>
                    </form>
                </div>
            </div>
        </div>
    `)
});

var server = app.listen(5000, function () {  
    var host = server.address().address  
    var port = server.address().port  
    console.log("Example app listening at http://localhost:5000/", host, port)  
})  
