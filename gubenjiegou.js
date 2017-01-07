'use strict';

const util = require('./common/util');
const fs = require('fs');
const async = require('async');
const _ = require('lodash');
gubenjiegou();

function gubenjiegou(){
	
	async.waterfall([
        (_cb) => {
            sign(_cb);
        },
        (token, _cb) => {
			console.log(token);
            getStockList(token, _cb);
        },
        (token, list, _cb) => {
			//console.log(list);
            getContent(token, list, _cb);
        }
    ], (err) => {
        if (err) {
            console.log(err);
        }
        else {
            console.log('gubenjiegou success');
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
				getGubenjiegou(stock, __cb);
			},
			(guben, __cb) => {
				myData.gubenjiegou = guben;
				let url = "https://gw.yundzh.com/f10/dstx/jjlt?obj=";
				let link = url + stock + '&token=' + token;
				getXianshoujiejin(link, __cb);
			},
			(xianshoujiejin, __cb) => {
				myData.xianshoujiejin = xianshoujiejin;
				getGudongmingxi(stock, __cb);
			},
			(gudongmingxi, __cb) => {
				myData.gudongmingxi = gudongmingxi;
				//console.log(JSON.stringify(myData, null, 4))
				let outputFilename = '../../f10/gubenjiegou/' + stock + '.json';
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


function getGubenjiegou(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_equity_structure?en_prod_code=' + stock;
	util.getData(url, (err, data) => {
	if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, {})
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(url, data,'data exception');
			return cb(null, {});
		}
		
		let date = _.keys(data.data[0])[0];
		let info = data.data[0][date][0][stock][0];
		cb(null, {
			total_shares : util.isNumber(info.total_shares.split(',').join('')),
			a_floats_shares : util.isNumber(info.a_floats_shares.split(',').join('')),
			b_floats_shares : util.isNumber(info.b_floats_shares.split(',').join(''))
		});
	});
}

function getXianshoujiejin(url, cb) {
	
		util.getData(url, (err, data) => {
	
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
				
			if (!data.Data || !data.Data.RepDataF10DstxJjltOutput || !data.Data.RepDataF10DstxJjltOutput[0]){
				console.log(url, data,'data exception');
				return cb(null, []);
			}
			
			var infos = data.Data.RepDataF10DstxJjltOutput[0].Data;
			var list = [];
			infos.forEach(function(item) {
				var info = {};
				info.date = item.date;
				info.jjgf = util.isBigNumber(item.jjgf);
				info.zzgf = util.isNull(item.zzgf, '%');
				list.push(info);
			})
			cb(null, list);
		});
}

function getGudongmingxi(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_shareholders?en_prod_code=' + stock;
	util.getData(url, (err, data) => {

	if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, [])
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(url, data,'data exception');
			return cb(null, []);
		}
		
		let date = _.keys(data.data[0])[0];
		let info = data.data[0][date][0][stock];
		let list = [];
		for(let i = 0 ; i < info.length ; i++ ) {
			let item = {};
			if (i < info.length - 1 && info[i+1].ash_num) {
				item.ash_inc_per = util.isNull(((info[i].ash_num - info[i+1].ash_num)/info[i+1].ash_num*100).toFixed(2), '%');
			} else {
				item.ash_inc_per = '--';
			}
			item.ash_num = info[i].ash_num;
			item.report_date = info[i].report_date;
			item.a_average_hold_sum = info[i].a_average_hold_sum;
			list.push(item);
		}
		cb(null, list);
	});
}