const wallet = require('ethereumjs-wallet');
const Web3 = require('web3');
var generator = require('generate-password');

const addressData = wallet.default.generate();
const web3 = new Web3('');

var password = generator.generate({
	length: 40,
	numbers: true
});

const keystore = web3.eth.accounts.encrypt(addressData.getPrivateKeyString(), password);
   
console.log("address: " + addressData.getAddressString());
console.log("privateKey: " + addressData.getPrivateKeyString()); 
console.log("password: " + password);
console.log("keystore: " + JSON.stringify(keystore));