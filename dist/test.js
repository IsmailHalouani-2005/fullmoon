const { ROLES, isInWolfCamp } = require('./types/roles');

console.log('LOUP_GAROU:', isInWolfCamp('LOUP_GAROU'));
console.log('LOUP_ALPHA:', isInWolfCamp('LOUP_ALPHA'));
console.log('GRAND_MECHANT_LOUP:', isInWolfCamp('GRAND_MECHANT_LOUP'));
console.log('LOUP_INFECT:', isInWolfCamp('LOUP_INFECT'));
console.log('VILLAGEOIS:', isInWolfCamp('VILLAGEOIS'));
