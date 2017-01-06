'use strict';

const util = require('./common/util');
const fs = require('fs');
const async = require('async');

longhubangdan();

function longhubangdan(){
	
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
            console.log('longhubangdan success');
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
				let url = "https://gw.yundzh.com/f10/cpbd/cjhb?obj=";
				let link = url + stock + '&token=' + token;
				getLonghubangdan(link, __cb);
			},
			(longhubangdan, __cb) => {
				myData.list = longhubangdan.reverse();
				let outputFilename = '../../f10/longhubangdan/' + stock + '.json';
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

function getLonghubangdan(link, cb){

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
		if (!data.Data || !data.Data.RepDataF10CpbdCjhbOutput || !data.Data.RepDataF10CpbdCjhbOutput[0]){
			console.log(link, 'data exception');
			return cb(null, []);
		}
			
		let trades = data.Data.RepDataF10CpbdCjhbOutput[0].Data;
		let list = [];
		trades.forEach((item) => {
			let trade = {};
			trade.mlze = 0;
			trade.mcze = 0;
			trade.mairu = [];
			trade.maichu = [];
			trade.date = item.date;
			let infos = item.data;
			infos.sort((pre, next) => {
				return next.mlje - pre.mlje;
			});
			for (let i = 0 ; i < infos.length && i < 5; i++) {
				trade.mlze += infos[i].mlje;
				trade.zdlx = infos[i].zdlx;
				trade.mairu.push({
					mlje : util.isBigNumber(infos[i].mlje),
					mcje : util.isBigNumber(infos[i].mcje),
					yybmc: infos[i].yybmc
				});
			}
			infos.sort((pre, next) => {
				return next.mcje - pre.mcje;
			});
			for (let i = 0 ; i < infos.length && i < 5; i++) {
				trade.mcze += infos[i].mcje;
				trade.zdlx = infos[i].zdlx;
				trade.maichu.push({
					mlje : util.isBigNumber(infos[i].mlje),
					mcje : util.isBigNumber(infos[i].mcje),
					yybmc: infos[i].yybmc
				});
			}
			trade.mlze = util.isBigNumber(trade.mlze);
			trade.mcze = util.isBigNumber(trade.mcze);
			trade.zdlx = filter(trade.zdlx);
			list.push(trade);
		})
		cb(null, list)
	});
}

function filter(string) {
	if (!string) return string;
	let reg = /单只标的证券的当日融资买入数量达到当日该证券总交易/;
    string = '当日融资买入数量占该证券总交易量50%以上';
	reg = /振幅/;
    string = '当日价格振幅达到15%的证券';
    reg = /涨跌幅偏离值/;
    string = '当日涨跌幅偏离值达7%的证券';
    reg = /换手/;
    string = '当日换手率达到20%以上';
    reg = /单只标的证券的当日融券卖出数量达到当日该证券总交易/;
    string ='当日融券卖出数量占该证券总交易量50%以上';
    return string;
}