var http = require("http")
const command = process.argv[2]

callback = function(response) {
    var str = '';
  
    //another chunk of data has been received, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });
  
    //the whole response has been received, so we just print it out here
    response.on('end', function () {
      console.log(str);
    });
  }

switch (command) {
    case "marker":
        const options = {
            host: "localhost",
            port: 3000,
            path: "/createStreamMarker"
        }
        http.request(options, callback).end()
        break
    }