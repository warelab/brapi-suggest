#!/usr/bin/env node

let BASE_URL = "https://test-server.brapi.org/brapi/v1/";
// const BASE_URL = "https://yambase.org/brapi/v1/";

const setBrAPI = function(url) {
  if (url.charAt(url.length) !== "/") {
    url += "/";
  }
  console.error("setting BASE_URL to ",url);
  BASE_URL = url;
}

const request = require('request-promise');
const _ = require('lodash');

const getPrograms = () => {
	const options = {
		method: 'GET',
		uri: BASE_URL + 'programs',
		qs: {
			page: 0,
			pageSize: 10
		},
		json: true
	}
	
	return request(options)
		.then(function(response){
			
		  return response.result.data;
		  
		})
		.catch(function(err){return console.log(err);});
};

const getTrials = (programDbId) => {
	const options = {
		method: 'GET',
		uri: BASE_URL + 'trials',
		qs: {
			page: 0,
			pageSize: 10,
      programDbId: programDbId
		},
		json: true
	}
	
	return request(options)
		.then(function(response){
			
		  return response.result.data;
		  
		})
		.catch(function(err){return console.log(err);});
};

const getStudies = (trialDbId) => {
	const options = {
		method: 'GET',
		uri: BASE_URL + 'studies',
		qs: {
			page: 0,
			pageSize: 10,
      trialDbId: trialDbId
		},
		json: true
	}
	
	return request(options)
		.then(function(response){
			
		  return response.result.data;
		  
		})
		.catch(function(err){return console.log(err);});
};

const getAnything = (endpoint, page) => {
  page = page || 0;
  const pageSize=100;
  console.error(`get ${BASE_URL}${endpoint}?page=${page}`);
  let options = {
    method: 'GET',
    uri: BASE_URL + endpoint,
    qs: {
      page: page,
      pageSize: pageSize
    },
    json: true
  };
  return request(options)
  .then(async response => {
    const prior = response.metadata.pagination.currentPage * response.metadata.pagination.pageSize;
    console.error(`prior=${prior}, totalCount=${response.metadata.pagination.totalCount}`);
    if (response.result.data.length === pageSize && response.result.data.length + prior < response.metadata.pagination.totalCount) {
      let moreData = await getAnything(endpoint, page+1);
      // if (!moreData) {
      //   console.error("moreData not defined",endpoint,page);
      // }
      if (!moreData.result) {
        console.error("moreData.result not defined",endpoint,page);
        process.exit(2);
      }
      _.concat(response.result.data, moreData.result.data);
      return response;
    }
    return response
  })
  .catch(err => console.error(err))
}

module.exports.setBrAPI = setBrAPI;
module.exports.getAnything = getAnything;
module.exports.getPrograms = getPrograms;
module.exports.getTrials = getTrials;
module.exports.getStudies = getStudies;