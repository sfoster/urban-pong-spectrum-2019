(function(){
  // the defaults, and property names we can expect on the querystring
  const config = {
    prefix: "/queue",
    heartbeatInterval: 5000,
  };
  // pull config from querystring
  var expectedKeys = new Set(Object.keys(config));

  var queryStr = location.search.substring(1);
  var pairs, nameValue, params = {};
  if(queryStr){
    pairs = queryStr.split('&');
    for(var i=0; i<pairs.length; i++) {
      nameValue = pairs[i].split('=');
      if(nameValue[0] && (expectedKeys.has(nameValue[0]))) {
        config[ nameValue[0] ] = nameValue[1];
      }
    }
    if(i >= pairs.length && location.hash) {
        config[ nameValue[0] ] += location.hash;
    }
  }

  window.config = config;
})();

