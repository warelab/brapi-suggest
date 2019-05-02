var request = require('request');
// GET /v1/suggest?query

module.exports = {
  // method handlers may just be the method handler...
  get: get
};

function get(req, res) {
  const url = `http://localhost:8983/solr/brapi/query?q=text:${req.query.q}`;
  request(url, function(err, response, body) {
    if (err) {
      res.json({error: err});
    }
    let results = JSON.parse(body);
    res.json(results);
  });
}

get.apiDoc = {
  summary: 'get suggestions',
  operationId: 'suggest',
  parameters: [
    {
      in: 'query',
      name: 'q',
      required: true,
      type: 'string'
    }
  ],
  responses: {
    200: {
      description: 'matching things grouped by entity',
      schema: {
        $ref: '#/definitions/SolrSuggestResponse'
      }
    },

    default: {
      description: 'Unexpected error',
      schema: {
        $ref: '#/definitions/Error'
      }
    }
  }
};
