'use strict';

function clog( ...out ){
	if (true) return;
	console.log( ...out );
}

function suitch( tokenList, tokenA, tokenB ){
	if ( tokenList.replace( tokenA, tokenB )){
		return tokenB;
	}
	tokenList.replace( tokenB, tokenA );
	return tokenA;
}

