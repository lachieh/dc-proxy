require('dotenv').config();
const http = require('http');
const httpProxy = require('http-proxy');

// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || '0.0.0.0';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 8080;

const API_KEY = process.env.API_KEY;

proxy = httpProxy.createProxyServer({});

var sendError = function(res, err) {
  return res.status(500).send({
    error: err,
    message: "An error occured in the proxy"
  });
};

proxy.on("error", function (err, req, res) {
  sendError(res, err);
});

function enableCors(req, res) {
  if (req.headers['access-control-request-method']) {
    res.setHeader('access-control-allow-methods', req.headers['access-control-request-method']);
  }

  if (req.headers['access-control-request-headers']) {
    res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers']);
  }

  if (req.headers.origin) {
    res.setHeader('access-control-allow-origin', req.headers.origin);
    res.setHeader('access-control-allow-credentials', 'true');
  }
};

function updateQueryStringParameter(path, key, value) {
  const re = new RegExp('([?&])' + key + '=.*?(&|$)', 'i');
  const separator = path.indexOf('?') !== -1 ? '&' : '?';
  if (path.match(re)) {
    return path.replace(re, '$1' + key + '=' + value + '$2');
  } else {
    return path + separator + key + '=' + value;
  }
};

function addToken(path) {
  const newPath = updateQueryStringParameter(path, 'token', API_KEY);
  return newPath;
}

proxy.on('proxyReq', function(proxyReq, req, res) {
  proxyReq.path = addToken(proxyReq.path);
})

// set header for CORS
proxy.on("proxyRes", function(proxyRes, req, res) {
  enableCors(req, res);
});

var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  if (req.method === 'OPTIONS') {
    enableCors(req, res);
    res.writeHead(200);
    res.end();
    return;
  }

  proxy.web(req, res, {
    target: process.env.TARGET_URL || 'https://trefle.io',
    secure: true,
    changeOrigin: true
  }, function(err) {
    sendError(res, err);
  });
});

server.listen(port, host, () => {
  console.log(`Listening on port ${port}`)
});