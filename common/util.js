'use strict';
const http = require('http');
const BufferHelper = require('bufferhelper');
const iconv = require('iconv-lite');
const  request =  require('request');
const async = require('async');

function download(url,code, cb) {
	let error = false;
    http.get(url, (res) => {
        let bufferHelper = new BufferHelper();
        res.on('data', (chunk) => {
            bufferHelper.concat(chunk);
        });
        res.on("end", () => {
			if (error) {
				cb(null);
			} else {
			    let val = iconv.decode(bufferHelper.toBuffer(), code);
				cb(val);	
			}
        });
    }).on("error", () => {
        error = true;
    });
}

exports.download = download;

var UTFTranslate = {
    Change:function(pValue){
        return pValue.replace(/[^\u0000-\u00FF]/g,function($0){return escape($0).replace(/(%u)(\w{4})/gi,"&#x$2;")});
    },
    ReChange:function(pValue){
        if (!pValue) return;
        return unescape(pValue.replace(/&#x/g,'%u').replace(/\\u/g,'%u').replace(/;/g,''));
    }
};

exports.UTFTranslate = UTFTranslate;

function getData(url, cb){

    async.retry({times: 3, interval: 1000}, (_cb) => {
        tryOnce(url, _cb);
    }, (err, result) => {
        if(err) return cb(err);
        cb(null, result);
    });
}

function  tryOnce(url, cb){

    request(
        {
            method: "get",
            url: url,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        },
        (error, response, body) => {
            if (error) return cb(error)
            cb(null, body);
        }
    )    
}
exports.getData = getData;

function stockDZH2HS(stock){
    
    if (stock.substr(0,2) == 'SZ'){
        return (stock.substring(2) + '.SZ');
    } else if (stock.substr(0,2) == 'SH') {
        return (stock.substring(2) + '.SS');
    } else {
        return null;
    }
}
exports.stockDZH2HS = stockDZH2HS;

function isNull(value, unit){
    if (value) {
        if (isNaN(value)) {
            return value;
        } else if (unit){
            return value + unit;
        } else {
            return value;
        }
        
    } else {
        return '--';
    }

}
exports.isNull = isNull;

function isNumber(value){
    if (value) {
        if (isNaN(value)) {
            return value;
        } else {
            value = Number(value);
            if (Math.abs(value) >= 10000) {
                value = value/10000;
            } else {
                return value;
            }
            if (Math.abs(value) >= 10000) {
                return (value/10000).toFixed(2) + '亿';
            } else {
                return value.toFixed(2) + '万';
            }
        }
        
    } else {
        return '--';
    }
}
exports.isNumber = isNumber;

function isBigNumber(value){
    if (value) {
        if (isNaN(value)) {
            return value;
        } else {
            value = Number(value);
            if (Math.abs(value) >= 10000) {
                return (value/10000).toFixed(2) + '亿';
            } else {
                return value.toFixed(2) + '万';
            }
        }
        
    } else {
        return '--';
    }
}
exports.isBigNumber = isBigNumber;