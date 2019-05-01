#!/usr/bin/env node

const brapi = require("./BrAPIClientService");
const _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));

function usage(die) {
  console.error("node scrape.js --name TEST_SERVER --url https://test-server.brapi.org/brapi/v1/ | redis-cli --pipe");
  die && process.exit(die);
} 

var brapiServiceName = argv.name;
var brapiServiceUrl = argv.url;
var flushme = argv.flush;
brapiServiceName && brapiServiceUrl || usage(1);

brapi.setBrAPI(brapiServiceUrl);


function redisify() {
  var red = [];
  red.push('*'+arguments.length);
  Array.prototype.slice.call(arguments).forEach(function(a) {
    red.push('$'+a.length,a);
  });
  return red.join("\r\n") + "\r";
}

function tidy(x) {
  let res=[];
  if (typeof x === 'object') {
    if (Array.isArray(x)) {
      x.forEach(xi => {
        res.push(tidy(xi));
      })
    }
    else if (x) {
      // Object.values(x).forEach(xi => {
      //   res.push(tidy(xi));
      // })
    }
  }
  else if (x) {
    res.push(x);
  }
  return _.flatten(res);
}

const getSearchables = async () => {
  const entityTypes = ['not a searchable','germplasm','images','markers','observationunits','programs','samples','studies','variables'];
  const indexedFields = {
    germplasm: ['germplasmPUI','germplasmDbId','germplasmName','commonCropName'],
    images: ['imageDbId','imageName','observationUnitDbId','observationDbId','descriptiveOntologyTerm'],
    markers: ['markerDbId','markerName','type'],
    observationunits: ['germplasmDbId','observationVariableDbId','studyDbId','locationDbId','trialDbId','programDbId','seasonDbId','observationLevel'],
    programs: ['commonCropName','programName','abbreviation'],
    samples: ['sampleDbId','observationUnitDbId','plateDbId','germplasmDbId'],
    studies: ['commonCropName','studyTypeDbId','programDbId','locationDbId','seasonDbId','trialDbId','studyDbId'],
    trials: ['trialDbId','commonCropName','programDbId','locationDbId','active'],
    traits: ['traitDbId'],
    variables: ['observationVariableDbId','traitClass']
  };
  const unindexedKey = {
    germplasm: 'germplasmDbId',
    images: 'imageDbId',
    markers: 'markerDbId',
    observationunits: 'observationUnitDbId',
    programs: 'programDbId',
    studies: 'studyDbId',
    samples: 'sampleDbId',
    trials: 'trialDbId',
    traits: 'traitDbId',
    variables: 'observationVariableDbId'
  };
  const unindexedLabel = {
    germplasm: 'germplasmName',
    images: 'imageName',
    markers: 'markerName',
    observationunits: 'observationUnitName',
    programs: 'programName',
    studies: 'studyName',
    samples: 'sampleDbId',
    traits: 'name',
    trials: 'trialName',
    variables: 'observationVariableName'
  };
  var calls = await brapi.getAnything('calls');
  let callIdx = _.keyBy(calls.result.data,'call');
  // let availableEntities = entityTypes.filter(entityType => callIdx.hasOwnProperty(`search/${entityType}`) && callIdx.hasOwnProperty(entityType));
  let availableEntities = entityTypes.filter(entityType => callIdx.hasOwnProperty(entityType));
  availableEntities.forEach(entityType => {
    brapi.getAnything(entityType).then(response => {
      if (!response) {
        console.error("response is undefined");
      }
      response && response.result.data.forEach(entity => {
        Object.keys(entity).forEach(field => {
          if (entity[field]) {
            let keyField = unindexedKey[entityType];
            let keyLabel = entity[unindexedLabel[entityType]];
            if (indexedFields[entityType][field]) {
              keyField = field;
              keyLabel = entity[keyField];
            }
            keyLabel = keyLabel || entity[unindexedKey[entityType]];
            let keyValue = entity[keyField];
            tidy(entity[field]).forEach(value => {
              if (value) {
                let key = JSON.stringify([entityType,keyField,keyValue,keyLabel,value]);
                // increment tally in redis
                console.log(redisify('HINCRBY',brapiServiceName,key,'1'));
              }
            })
          }
        })
      })
    })
  })
}

console.log(redisify('SELECT','1'));
flushme && console.log(redisify('FLUSHDB'));
getSearchables();
