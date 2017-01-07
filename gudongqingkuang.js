'use strict';
const _ = require('lodash');
const util = require('./common/util');
const fs = require('fs');
const async = require('async');
require('date-utils');

gudongqingkuang();
function gudongqingkuang(){
	
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
            console.log('gudongqingkuang success');
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
				getGudongrenshu(stock, __cb);
			},
			(gudongrenshu, __cb) => {
				getLastpx(stock, gudongrenshu, __cb);
			},
			(gudongrenshu, __cb) => {
				myData.gudongrenshu = gudongrenshu;
				getShidaliutong(stock , __cb);
			},
			(shidaliutong, __cb) => {
				myData.shidaliutong = shidaliutong;
				getShidagudong(stock , __cb);
			},
			(shidagudong, __cb) => {
				myData.shidagudong = shidagudong;
				let url = "https://gw.yundzh.com/f10/dstx/cgbdqk?obj=";
				let link = url + stock + '&token=' + token;
				getChigubiandong(link, __cb);
			},
			(chigubiandong, __cb) => {
				getClosepx(stock, chigubiandong, __cb);
			},
			(chigubiandong, __cb) => {
				myData.chigubiandong = chigubiandong;
				getJijingchigu(stock,  __cb);
			},
			(jijingchigu, __cb) => {
				myData.jijingchigu = jijingchigu;
				let outputFilename = '../../f10/gudongqingkuang/' + stock + '.json';
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



function getGudongrenshu(stock, cb){

	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_shareholders?en_prod_code=' + stock;
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
		cb(null, info);
	});


}



function getLastpx(stock, gudongrenshu, cb) {

	stock = util.stockDZH2HS(stock);
	async.eachSeries(gudongrenshu, (item, _cb) => {
		
		let url = 'http://onehou.com/api/hs/quote/v1/kline?get_type=offset&prod_code=' + stock + '&candle_mode=1&candle_period=1&fields=close_px&search_direction=2&min_time=1459&data_count=1&date=' + new Date(item.report_date).toFormat("YYYYMMDD");
		util.getData(url, (err, data) => {

			if (err) {
				return _cb(err);
			} else if (!data) {
				return _cb('no data');
			} else if (typeof data == 'string') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log(url,e);
					item.close_px = '--';
					item.a_average_hold_amount = '--';
					item.concentration = '--';
					return _cb();
				}
			}

			if (!data.data || !data.data.candle){
				console.log(url, data,'data exception');
				item.close_px = '--';
				item.a_average_hold_amount = '--';
				item.concentration = '--';
				return _cb();
			}
	
			let info = data.data.candle[stock];
			if (!info[0] || !info[0][1]) {
				console.log(url, data.data.candle, 'no data');
				item.close_px = '--';
				item.a_average_hold_amount = '--';
				item.concentration = '--';
				return _cb();
			}
			item.close_px = info[0][1];
			item.a_average_hold_amount = (item.close_px * item.a_average_hold_sum.split(',').join('') / 10000).toFixed(2);
			if (item.a_average_hold_amount >= 30) {
				item.concentration = '非常集中';
			} else if (item.a_average_hold_amount >= 20) {
				item.concentration = '比较集中';
			} else if (item.a_average_hold_amount >= 10) {
				item.concentration = '普通集中';
			} else if (item.a_average_hold_amount >= 5) {
				item.concentration = '筹码分散';
			} else {
				item.concentration = '非常分散';
			}
			item.close_px = util.isNull(item.close_px, '元');
			item.a_average_hold_amount = util.isBigNumber(item.a_average_hold_amount);
			item.a_average_hold_sum = util.isNumber(item.a_average_hold_sum.split(',').join(''));
			item.ash_num = util.isNumber(item.ash_num);
			_cb();
		});

	},(err) => {
		if (err) return cb(err);
		cb(null, gudongrenshu);
	})
}

function getShidaliutong(stock, cb){

	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_top10_float_shareholders?en_prod_code=' + stock;
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
		cb(null, _.map(info, (item) => {
			return {
				hold_sum: util.isNumber(item.hold_sum),
				pct_of_total_shares: util.isNull(Number(item.pct_of_total_shares).toFixed(2), '%'),
				sh_list: util.isNull(item.sh_list)
			}
		}));
	});
}


function getShidagudong(stock, cb){

	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_top10_shareholders?en_prod_code=' + stock;
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
		cb(null, _.map(info, (item) => {
			return {
				hold_sum: util.isNumber(item.hold_sum),
				pct_of_total_shares: util.isNull(Number(item.pct_of_total_shares).toFixed(2), '%'),
				sh_list: util.isNull(item.sh_list)
			}
		}));
	});
}


function getChigubiandong(link, cb){

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
		if (!data.Data || !data.Data.RepDataF10DstxCgbdqkOutput || !data.Data.RepDataF10DstxCgbdqkOutput[0]){
			console.log(link, 'data exception');
			return cb(null, []);
		}
			
		let trades = data.Data.RepDataF10DstxCgbdqkOutput[0].Data;
		cb(null, _.map(trades, (item) => {
			return {
				date: item.date,
				bdsl: item.bdsl,
				djg: item.djg,
				bdyy: item.bdyy
			}
		}));
	});


}



function getClosepx(stock, chigubiandong, cb) {

	stock = util.stockDZH2HS(stock);
	async.eachSeries(chigubiandong, (item, _cb) => {
		
		let url = 'http://onehou.com/api/hs/quote/v1/kline?get_type=offset&prod_code=' + stock + '&candle_mode=1&candle_period=1&fields=close_px&search_direction=2&min_time=1459&data_count=1&date=' + new Date(item.date).toFormat("YYYYMMDD");
		util.getData(url, (err, data) => {

			if (err) {
				return _cb(err);
			} else if (!data) {
				return _cb('no data');
			} else if (typeof data == 'string') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log(url, e);
					item.close_px = '--';
					return _cb();
				}
			}
			
			item.date = util.isNull(item.date);
			item.bdsl = util.isNumber(item.bdsl);
			item.djg = util.isNull(item.djg);
			item.bdyy = util.isNull(item.bdyy);

			if (!data.data || !data.data.candle){
				console.log(url, data,'data exception');
				item.close_px = '--';
				return _cb();
			}
	
			let info = data.data.candle[stock];
			if (!info[0] || !info[0][1]) {
				console.log(url, data.data.candle, 'no data');
				item.close_px = '--';
				return _cb();
			}
			item.close_px = info[0][1];
			item.close_px = util.isNull(item.close_px, '元');

			_cb();
		});

	},(err) => {
		if (err) return cb(err);
		cb(null, chigubiandong);
	})
}

function getJijingchigu(stock, cb){

	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_fund_holdings?en_prod_code=' + stock;
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
		
		cb(null, _.map(info, (item) => {
			return {
				fund_holding_num: util.isNull(item.fund_holding_num),
				pct_of_float_share: util.isNull(item.pct_of_float_share*100, '%'),
				fund_holding_shares: util.isNumber(item.fund_holding_shares),
				report_date: util.isNull(item.report_date)
			}
		}));
	});
}