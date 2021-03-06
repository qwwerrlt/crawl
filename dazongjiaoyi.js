'use strict';

const util = require('./common/util');
const fs = require('fs');
const async = require('async');
const _ = require('lodash');
dazongjiaoyi();

function dazongjiaoyi(){
	
	async.waterfall([
        (_cb) => {
            sign(_cb);
        },
        (token, _cb) => {
			console.log(token);
            getStockList(token, _cb);
        },
        (token, list, _cb) => {
            getContent(token, list, _cb);
        }
    ], (err) => {
        if (err) {
            console.log(err);
        }
        else {
            console.log('dazongjiaoyi success');
        }
    });
}


function sign(cb){
	var url = 'https://gw.yundzh.com/token/access?appid=dcdc435cc4aa11e587bf0242ac1101de&secret_key=InsQbm2rXG5z';
	util.getData(url, (err, data) => {
		if (err){
			return cb(err);
		}
		if (typeof data == 'string') {
			data = JSON.parse(data);
		}
		cb(null, data.Data.RepDataToken[0].token);
	})
}

function getStockList(token, cb) {

	var link = 'https://gw.yundzh.com/stkdata?gql=block=' +
		encodeURIComponent('股票') + '\\' + encodeURIComponent('市场分类') + '\\'
		+ encodeURIComponent('全部A股') + '&token=' + token;

	util.getData(link,(err, data) => {
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (data.Err) {
			return cb(data.Err);
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				return cb(e)

			}
		}
		
		if (!data.Data || !data.Data.RepDataStkData){
			console.log(JSON.stringify(data));
			return cb('data exception');
		}
		
		let list = [];
		let stocks = data.Data.RepDataStkData;
		stocks.forEach((item) => {
			list.push(item.Obj);
		});
		cb(null, token, list);
	});
}


function getContent(token, list, cb){
	
	async.eachSeries(list, (stock, _cb) => {
		var myData = {
			stock: stock,
		}
		async.waterfall([
			(__cb) => {
				let url = "https://gw.yundzh.com/f10/dstx/dzjy?obj=";
				let link = url + stock + '&token=' + token;
				getDazongjiaoyi(link, __cb);
			},
			(dazongjiaoyi, __cb) => {
				myData.dazongjiaoyi = dazongjiaoyi.reverse();
				let outputFilename = '../../f10/dazongjiaoyi/' + stock + '.json';
				fs.writeFile(outputFilename, JSON.stringify(myData, null, 4), __cb);
			}], (err) => {
				if (err) return _cb(err);
				_cb();
			}
		);
	},(err) => {
		if (err) return cb(err);
		cb();
	})
	
}

function getDazongjiaoyi(link, cb){

	util.getData(link, (err, data) => {
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (data.Err) {
			return cb(data.Err);
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(link, e);
				return cb(null, []);

			}

		}
		if (!data.Data || !data.Data.RepDataF10DstxDzjyOutput || !data.Data.RepDataF10DstxDzjyOutput[0]){
			console.log(link, 'data exception');
			return cb(null, []);
		}
			
		let trades = data.Data.RepDataF10DstxDzjyOutput[0].Data;
		cb(null, _.map(trades, (item) => {
			return {
				date: item.date,
				jg: item.jg,
				cjl: util.isBigNumber(item.cjl),
				cjje: util.isBigNumber(item.cjje),
				mf: item.mf,
				mf2: item.mf2
			}
		}));
	});
}


